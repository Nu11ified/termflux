import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { apps, workspaceApps, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "./auth";

export const appsRoutes = new Elysia({ prefix: "/apps" })
  .use(bearer())
  // List all public apps
  .get("/", async () => {
    const publicApps = await db.query.apps.findMany({
      where: eq(apps.isPublic, true),
    });

    return { apps: publicApps };
  })

  // Get app by ID
  .get("/:id", async ({ params, set }) => {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, params.id),
    });

    if (!app) {
      set.status = 404;
      return { error: "App not found" };
    }

    return { app };
  })

  // Install app to workspace
  .post(
    "/install",
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

      // Verify app exists
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, body.appId),
      });

      if (!app) {
        set.status = 404;
        return { error: "App not found" };
      }

      // Check if already installed
      const existing = await db.query.workspaceApps.findFirst({
        where: and(
          eq(workspaceApps.workspaceId, body.workspaceId),
          eq(workspaceApps.appId, body.appId)
        ),
      });

      if (existing) {
        set.status = 400;
        return { error: "App already installed in this workspace" };
      }

      // Install app
      const [installed] = await db
        .insert(workspaceApps)
        .values({
          workspaceId: body.workspaceId,
          appId: body.appId,
          config: body.config || {},
        })
        .returning();

      return { installation: installed };
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        appId: t.String(),
        config: t.Optional(t.Any()),
      }),
    }
  )

  // Uninstall app from workspace
  .delete(
    "/uninstall",
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

      await db
        .delete(workspaceApps)
        .where(
          and(
            eq(workspaceApps.workspaceId, body.workspaceId),
            eq(workspaceApps.appId, body.appId)
          )
        );

      return { success: true };
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        appId: t.String(),
      }),
    }
  )

  // Get installed apps for a workspace
  .get("/workspace/:workspaceId", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    // Verify workspace exists and belongs to user
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

    const installedApps = await db.query.workspaceApps.findMany({
      where: eq(workspaceApps.workspaceId, params.workspaceId),
    });

    return { apps: installedApps };
  });
