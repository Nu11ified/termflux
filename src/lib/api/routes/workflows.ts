import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { workflows, workflowRuns, workspaces } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "./auth";
import { workflowEngine, type WorkflowDefinition } from "@/lib/workflows/engine";

export const workflowRoutes = new Elysia({ prefix: "/workflows" })
  .use(bearer())
  // List workflows for a workspace
  .get("/workspace/:workspaceId", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // Verify workspace access
    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, params.workspaceId), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 404;
      return { error: "Workspace not found" };
    }

    const workflowList = await db.query.workflows.findMany({
      where: eq(workflows.workspaceId, params.workspaceId),
      orderBy: [desc(workflows.updatedAt)],
    });

    return { workflows: workflowList };
  })

  // Get single workflow
  .get("/:id", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, params.id),
    });

    if (!workflow) {
      set.status = 404;
      return { error: "Workflow not found" };
    }

    // Verify workspace access
    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, workflow.workspaceId), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    // Get recent runs
    const runs = await db.query.workflowRuns.findMany({
      where: eq(workflowRuns.workflowId, params.id),
      orderBy: [desc(workflowRuns.createdAt)],
      limit: 10,
    });

    return { workflow, runs };
  })

  // Create workflow
  .post(
    "/",
    async ({ body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      // Verify workspace access
      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, body.workspaceId), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 404;
        return { error: "Workspace not found" };
      }

      const [workflow] = await db
        .insert(workflows)
        .values({
          workspaceId: body.workspaceId,
          name: body.name,
          description: body.description,
          definition: body.definition as unknown as typeof workflows.$inferSelect["definition"],
          env: body.env || {},
          isActive: true,
        })
        .returning();

      return { workflow };
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        definition: t.Object({
          id: t.String(),
          name: t.String(),
          description: t.Optional(t.String()),
          steps: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              type: t.Union([
                t.Literal("shell"),
                t.Literal("parallel"),
                t.Literal("sequential"),
                t.Literal("conditional"),
                t.Literal("wait"),
              ]),
              command: t.Optional(t.String()),
              timeout: t.Optional(t.Number()),
              retries: t.Optional(t.Number()),
              onFailure: t.Optional(
                t.Union([t.Literal("continue"), t.Literal("stop"), t.Literal("retry")])
              ),
              workingDir: t.Optional(t.String()),
            })
          ),
        }),
        env: t.Optional(t.Record(t.String(), t.String())),
      }),
    }
  )

  // Update workflow
  .patch(
    "/:id",
    async ({ params, body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, params.id),
      });

      if (!workflow) {
        set.status = 404;
        return { error: "Workflow not found" };
      }

      // Verify workspace access
      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, workflow.workspaceId), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 403;
        return { error: "Access denied" };
      }

      const [updated] = await db
        .update(workflows)
        .set({
          ...body,
          definition: body.definition as unknown as typeof workflows.$inferSelect["definition"],
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, params.id))
        .returning();

      return { workflow: updated };
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        definition: t.Optional(t.Any()),
        env: t.Optional(t.Record(t.String(), t.String())),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  // Delete workflow
  .delete("/:id", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, params.id),
    });

    if (!workflow) {
      set.status = 404;
      return { error: "Workflow not found" };
    }

    // Verify workspace access
    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, workflow.workspaceId), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    await db.delete(workflows).where(eq(workflows.id, params.id));

    return { success: true };
  })

  // Run workflow
  .post(
    "/:id/run",
    async ({ params, body, bearer, set }) => {
      const user = await getAuthUser(bearer);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      const workflow = await db.query.workflows.findFirst({
        where: eq(workflows.id, params.id),
      });

      if (!workflow) {
        set.status = 404;
        return { error: "Workflow not found" };
      }

      // Verify workspace access
      const workspace = await db.query.workspaces.findFirst({
        where: and(eq(workspaces.id, workflow.workspaceId), eq(workspaces.userId, user.id)),
      });

      if (!workspace) {
        set.status = 403;
        return { error: "Access denied" };
      }

      if (workspace.status !== "running") {
        set.status = 400;
        return { error: "Workspace is not running" };
      }

      try {
        const runId = await workflowEngine.startWorkflow(
          params.id,
          workflow.workspaceId,
          user.id,
          body?.variables || {}
        );

        return {
          runId,
          message: "Workflow started",
        };
      } catch (error) {
        set.status = 500;
        return { error: `Failed to start workflow: ${(error as Error).message}` };
      }
    },
    {
      body: t.Optional(
        t.Object({
          variables: t.Optional(t.Record(t.String(), t.String())),
        })
      ),
    }
  )

  // Get run status
  .get("/runs/:runId", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const run = await db.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, params.runId),
    });

    if (!run) {
      set.status = 404;
      return { error: "Run not found" };
    }

    // Verify workspace access
    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, run.workspaceId), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    // Get real-time status from engine
    const status = await workflowEngine.getRunStatus(params.runId);

    return { run: status || run };
  })

  // Cancel run
  .post("/runs/:runId/cancel", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const run = await db.query.workflowRuns.findFirst({
      where: eq(workflowRuns.id, params.runId),
    });

    if (!run) {
      set.status = 404;
      return { error: "Run not found" };
    }

    // Verify workspace access
    const workspace = await db.query.workspaces.findFirst({
      where: and(eq(workspaces.id, run.workspaceId), eq(workspaces.userId, user.id)),
    });

    if (!workspace) {
      set.status = 403;
      return { error: "Access denied" };
    }

    try {
      await workflowEngine.cancelWorkflow(params.runId);
      return { success: true };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to cancel workflow: ${(error as Error).message}` };
    }
  });
