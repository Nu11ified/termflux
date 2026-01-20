import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { workspaces, sessions, orgMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "./auth";
import { containerManager } from "@/lib/docker";
import { workspaceProvisioner } from "@/lib/workspace/provisioner";
import { sessionManager } from "@/lib/redis";
import { secretsManager } from "@/lib/secrets";
import { terminalWSServer } from "@/lib/terminal/ws-server";

export const workspaceRoutes = new Elysia({ prefix: "/workspaces" })
  .use(bearer())
  // List workspaces for authenticated user
  .get("/", async ({ bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const userWorkspaces = await db.query.workspaces.findMany({
      where: eq(workspaces.userId, user.id),
      orderBy: [desc(workspaces.lastAccessedAt), desc(workspaces.createdAt)],
    });

    // Enrich with real-time status from Redis
    const enrichedWorkspaces = await Promise.all(
      userWorkspaces.map(async (ws) => {
        const redisState = await sessionManager.getWorkspace(ws.id);
        const containerStatus = await containerManager.getWorkspaceStatus(ws.id);

        return {
          ...ws,
          realTimeStatus: containerStatus,
          activeSessions: redisState?.activeSessions || 0,
        };
      })
    );

    return { workspaces: enrichedWorkspaces };
  })

  // Get single workspace with details
  .get("/:id", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 404;
      return { error: "Workspace not found" };
    }

    // Get workspace sessions
    const workspaceSessions = await db.query.sessions.findMany({
      where: eq(sessions.workspaceId, workspace.id),
    });

    // Get real-time stats
    const stats = await containerManager.getWorkspaceStats(workspace.id);
    const healthStatus = await workspaceProvisioner.getHealthStatus(workspace.id);
    const secrets = await secretsManager.listSecrets(workspace.id);

    return {
      workspace,
      sessions: workspaceSessions,
      stats,
      health: healthStatus,
      secrets: secrets.map((s) => ({ id: s.id, name: s.name })), // Don't expose values
    };
  })

  // Create new workspace
  .post(
    "/",
    async ({ body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Get user's default organization
      const userOrgMember = await db.query.orgMembers.findFirst({
        where: eq(orgMembers.userId, user.id),
      });

      if (!userOrgMember) {
        set.status = 400;
        return { error: "User has no organization" };
      }

      const [workspace] = await db
        .insert(workspaces)
        .values({
          name: body.name,
          orgId: userOrgMember.orgId,
          userId: user.id,
          status: "stopped",
          image: body.image || "termflux-workspace:latest",
          cpuLimit: body.cpuLimit || 2,
          memoryLimit: body.memoryLimit || 2048,
          diskLimit: body.diskLimit || 10240,
          env: body.env || {},
        })
        .returning();

      return { workspace };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        image: t.Optional(t.String()),
        cpuLimit: t.Optional(t.Number()),
        memoryLimit: t.Optional(t.Number()),
        diskLimit: t.Optional(t.Number()),
        env: t.Optional(t.Record(t.String(), t.String())),
      }),
    }
  )

  // Start workspace - creates Docker container
  .post(
    "/:id/start",
    async ({ params, body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 404;
        return { error: "Workspace not found" };
      }

      // Check current status
      const currentStatus = await containerManager.getWorkspaceStatus(workspace.id);
      if (currentStatus === "running") {
        return { workspace, message: "Workspace is already running" };
      }

      // Update status to creating
      await db
        .update(workspaces)
        .set({
          status: "creating",
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, params.id));

      try {
        // Provision the workspace with Docker container
        const containerId = await workspaceProvisioner.provisionWorkspace(
          {
            id: workspace.id,
            name: workspace.name,
            userId: user.id,
            image: workspace.image || undefined,
            cpuLimit: workspace.cpuLimit || undefined,
            memoryLimit: workspace.memoryLimit || undefined,
            diskLimit: workspace.diskLimit || undefined,
            env: workspace.env as Record<string, string> || undefined,
          },
          {
            dotfiles: body?.dotfiles,
            gitConfig: body?.gitConfig,
            environment: body?.environment,
            sshKey: body?.sshKey,
          }
        );

        // Update workspace with container ID
        const [updated] = await db
          .update(workspaces)
          .set({
            status: "running",
            containerId,
            lastAccessedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workspaces.id, params.id))
          .returning();

        return { workspace: updated, message: "Workspace started successfully" };
      } catch (error) {
        // Revert status on failure
        await db
          .update(workspaces)
          .set({
            status: "stopped",
            updatedAt: new Date(),
          })
          .where(eq(workspaces.id, params.id));

        set.status = 500;
        return { error: `Failed to start workspace: ${(error as Error).message}` };
      }
    },
    {
      body: t.Optional(
        t.Object({
          dotfiles: t.Optional(
            t.Object({
              repository: t.Optional(t.String()),
              branch: t.Optional(t.String()),
              installScript: t.Optional(t.String()),
            })
          ),
          gitConfig: t.Optional(
            t.Object({
              name: t.String(),
              email: t.String(),
            })
          ),
          environment: t.Optional(t.Record(t.String(), t.String())),
          sshKey: t.Optional(t.String()),
        })
      ),
    }
  )

  // Stop workspace - stops Docker container
  .post("/:id/stop", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 404;
      return { error: "Workspace not found" };
    }

    try {
      // Stop the container
      await containerManager.stopWorkspace(params.id);

      // Close all active sessions in database
      await db
        .update(sessions)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(sessions.workspaceId, params.id));

      // Update workspace status
      const [updated] = await db
        .update(workspaces)
        .set({
          status: "stopped",
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, params.id))
        .returning();

      // Update Redis
      await sessionManager.updateWorkspaceStatus(params.id, "stopped");

      return { workspace: updated };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to stop workspace: ${(error as Error).message}` };
    }
  })

  // Delete workspace - removes container and optionally volume
  .delete(
    "/:id",
    async ({ params, query, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 404;
        return { error: "Workspace not found" };
      }

      try {
        // Remove container and optionally volume
        const removeVolume = query.removeVolume === "true";
        await containerManager.removeWorkspace(params.id, removeVolume);

        // Delete associated sessions
        await db.delete(sessions).where(eq(sessions.workspaceId, params.id));

        // Delete workspace from database
        await db.delete(workspaces).where(eq(workspaces.id, params.id));

        return { success: true };
      } catch (error) {
        set.status = 500;
        return { error: `Failed to delete workspace: ${(error as Error).message}` };
      }
    }
  )

  // Update workspace
  .patch(
    "/:id",
    async ({ params, body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 404;
        return { error: "Workspace not found" };
      }

      const [updated] = await db
        .update(workspaces)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, params.id))
        .returning();

      return { workspace: updated };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        cpuLimit: t.Optional(t.Number()),
        memoryLimit: t.Optional(t.Number()),
        diskLimit: t.Optional(t.Number()),
        env: t.Optional(t.Record(t.String(), t.String())),
      }),
    }
  )

  // Execute command in workspace
  .post(
    "/:id/exec",
    async ({ params, body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 404;
        return { error: "Workspace not found" };
      }

      const status = await containerManager.getWorkspaceStatus(params.id);
      if (status !== "running") {
        set.status = 400;
        return { error: "Workspace is not running" };
      }

      try {
        const result = await containerManager.exec(
          params.id,
          Array.isArray(body.command) ? body.command : ["bash", "-c", body.command],
          {
            workingDir: body.workingDir,
            env: body.env ? Object.entries(body.env).map(([k, v]) => `${k}=${v}`) : undefined,
          }
        );

        return result;
      } catch (error) {
        set.status = 500;
        return { error: `Exec failed: ${(error as Error).message}` };
      }
    },
    {
      body: t.Object({
        command: t.Union([t.String(), t.Array(t.String())]),
        workingDir: t.Optional(t.String()),
        env: t.Optional(t.Record(t.String(), t.String())),
      }),
    }
  )

  // Get workspace stats
  .get("/:id/stats", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 404;
      return { error: "Workspace not found" };
    }

    const stats = await containerManager.getWorkspaceStats(params.id);
    if (!stats) {
      set.status = 404;
      return { error: "Stats not available - workspace may not be running" };
    }

    return { stats };
  })

  // Get workspace health
  .get("/:id/health", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, params.id), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 404;
      return { error: "Workspace not found" };
    }

    const health = await workspaceProvisioner.getHealthStatus(params.id);
    return { health };
  });
