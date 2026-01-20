import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { sessions, workspaces, authSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "./auth";
import { containerManager } from "@/lib/docker";
import { sessionManager, type RedisSessionState } from "@/lib/redis";
import { terminalWSServer } from "@/lib/terminal/ws-server";
import { nanoid } from "nanoid";

export const sessionRoutes = new Elysia({ prefix: "/sessions" })
  .use(bearer())
  // Create new terminal session in a workspace
  .post(
    "/",
    async ({ body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Verify workspace exists and belongs to user
      const workspace = await db.query.workspaces.findFirst({
        where: and(
          eq(workspaces.id, body.workspaceId),
          eq(workspaces.userId, user.id)
        ),
      });

      if (!workspace) {
        set.status = 404;
        return { error: "Workspace not found" };
      }

      if (workspace.status !== "running") {
        set.status = 400;
        return { error: "Workspace is not running" };
      }

      // Verify container is actually running
      const containerStatus = await containerManager.getWorkspaceStatus(body.workspaceId);
      if (containerStatus !== "running") {
        set.status = 400;
        return { error: "Workspace container is not running" };
      }

      const sessionId = nanoid(12);
      const tmuxSession = `termflux-${sessionId}`;

      try {
        // Create tmux session in container
        const container = await containerManager.getContainer(body.workspaceId);
        if (!container) {
          set.status = 500;
          return { error: "Container not found" };
        }

        // Initialize tmux session
        const exec = await container.exec({
          Cmd: [
            "tmux",
            "new-session",
            "-d",
            "-s",
            tmuxSession,
            "-x",
            (body.cols || 120).toString(),
            "-y",
            (body.rows || 40).toString(),
          ],
          AttachStdout: true,
          AttachStderr: true,
          User: "1000:1000",
        });

        await exec.start({ Detach: false });

        // Create session in database
        const [session] = await db
          .insert(sessions)
          .values({
            id: sessionId,
            workspaceId: body.workspaceId,
            name: body.name || `Terminal ${sessionId.slice(0, 6)}`,
            status: "active",
            cols: body.cols || 120,
            rows: body.rows || 40,
            shellPath: "/bin/bash",
            tmuxSession,
            tmuxWindow: 0,
            lastSeenAt: new Date(),
          })
          .returning();

        // Store in Redis for real-time routing
        const redisState: RedisSessionState = {
          id: sessionId,
          workspaceId: body.workspaceId,
          userId: user.id,
          containerId: workspace.containerId!,
          tmuxSession,
          tmuxWindow: 0,
          status: "active",
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        };
        await sessionManager.setSession(redisState);

        // Generate WebSocket connection URL
        const wsUrl = `/ws/terminal?workspaceId=${body.workspaceId}&sessionId=${sessionId}&token=${bearer}`;

        return {
          session,
          wsUrl,
          message: "Session created. Connect via WebSocket for terminal I/O.",
        };
      } catch (error) {
        set.status = 500;
        return { error: `Failed to create session: ${(error as Error).message}` };
      }
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        name: t.Optional(t.String()),
        cols: t.Optional(t.Number()),
        rows: t.Optional(t.Number()),
      }),
    }
  )

  // Get session by ID
  .get("/:id", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      set.status = 404;
      return { error: "Session not found" };
    }

    // Verify user owns the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: and(
        eq(workspaces.id, session.workspaceId),
        eq(workspaces.userId, user.id)
      ),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    // Get Redis state for real-time info
    const redisState = await sessionManager.getSession(params.id);

    // Generate reconnection URL if session is still active
    let wsUrl = null;
    if (session.status === "active" && workspace.status === "running") {
      wsUrl = `/ws/terminal?workspaceId=${session.workspaceId}&sessionId=${params.id}&token=${bearer}`;
    }

    return {
      session,
      realTimeStatus: redisState?.status || session.status,
      lastActivity: redisState?.lastActivity || session.lastSeenAt?.toISOString(),
      wsUrl,
    };
  })

  // Update session (resize, rename)
  .patch(
    "/:id",
    async ({ params, body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, params.id),
      });

      if (!session) {
        set.status = 404;
        return { error: "Session not found" };
      }

      // Verify user owns the workspace
      const workspace = await db.query.workspaces.findFirst({
        where: and(
          eq(workspaces.id, session.workspaceId),
          eq(workspaces.userId, user.id)
        ),
      });

      if (!workspace) {
        set.status = 403;
        return { error: "Access denied" };
      }

      // If resizing, resize the tmux window too
      if ((body.cols || body.rows) && session.tmuxSession) {
        try {
          const container = await containerManager.getContainer(session.workspaceId);
          if (container) {
            const exec = await container.exec({
              Cmd: [
                "tmux",
                "resize-window",
                "-t",
                session.tmuxSession,
                "-x",
                (body.cols || session.cols || 120).toString(),
                "-y",
                (body.rows || session.rows || 40).toString(),
              ],
              AttachStdout: true,
              AttachStderr: true,
              User: "1000:1000",
            });
            await exec.start({ Detach: false });
          }
        } catch (error) {
          console.error("Failed to resize tmux window:", error);
        }
      }

      const [updated] = await db
        .update(sessions)
        .set({
          ...body,
          lastSeenAt: new Date(),
        })
        .where(eq(sessions.id, params.id))
        .returning();

      return { session: updated };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        cols: t.Optional(t.Number()),
        rows: t.Optional(t.Number()),
      }),
    }
  )

  // Close session
  .delete("/:id", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      set.status = 404;
      return { error: "Session not found" };
    }

    // Verify user owns the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: and(
        eq(workspaces.id, session.workspaceId),
        eq(workspaces.userId, user.id)
      ),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    try {
      // Kill tmux session in container
      if (session.tmuxSession) {
        const container = await containerManager.getContainer(session.workspaceId);
        if (container) {
          const exec = await container.exec({
            Cmd: ["tmux", "kill-session", "-t", session.tmuxSession],
            AttachStdout: true,
            AttachStderr: true,
            User: "1000:1000",
          });
          await exec.start({ Detach: false }).catch(() => {
            // Session might already be closed
          });
        }
      }

      // Terminate WebSocket connection if active
      await terminalWSServer.terminateSession(params.id);

      // Remove from Redis
      await sessionManager.removeSession(params.id);

      // Update session status in database
      await db
        .update(sessions)
        .set({ status: "terminated", closedAt: new Date() })
        .where(eq(sessions.id, params.id));

      return { success: true };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to close session: ${(error as Error).message}` };
    }
  })

  // Heartbeat - update last seen
  .post("/:id/heartbeat", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      set.status = 404;
      return { error: "Session not found" };
    }

    // Update database
    await db
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, params.id));

    // Update Redis
    await sessionManager.updateActivity(params.id);

    return { success: true };
  })

  // Get session output buffer (for reconnection)
  .get("/:id/buffer", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, params.id),
    });

    if (!session) {
      set.status = 404;
      return { error: "Session not found" };
    }

    // Verify user owns the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: and(
        eq(workspaces.id, session.workspaceId),
        eq(workspaces.userId, user.id)
      ),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    // Get buffer from Redis
    const buffer = await sessionManager.getTerminalBuffer(params.id);

    return {
      buffer: buffer.join(""),
      lines: buffer.length,
    };
  })

  // List all active sessions for a workspace
  .get("/workspace/:workspaceId", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // Verify user owns the workspace
    const workspace = await db.query.workspaces.findFirst({
      where: and(
        eq(workspaces.id, params.workspaceId),
        eq(workspaces.userId, user.id)
      ),
    });

    if (!workspace) {
      set.status = 404;
      return { error: "Workspace not found" };
    }

    // Get sessions from database
    const dbSessions = await db.query.sessions.findMany({
      where: and(
        eq(sessions.workspaceId, params.workspaceId),
        eq(sessions.status, "active")
      ),
    });

    // Enrich with real-time state from Redis
    const enrichedSessions = await Promise.all(
      dbSessions.map(async (session) => {
        const redisState = await sessionManager.getSession(session.id);
        return {
          ...session,
          realTimeStatus: redisState?.status || session.status,
          lastActivity: redisState?.lastActivity || session.lastSeenAt?.toISOString(),
        };
      })
    );

    return { sessions: enrichedSessions };
  });
