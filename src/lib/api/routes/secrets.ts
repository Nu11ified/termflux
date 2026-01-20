import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "./auth";
import { secretsManager } from "@/lib/secrets";

export const secretsRoutes = new Elysia({ prefix: "/secrets" })
  .use(bearer())
  // List secrets for a workspace (names only, no values)
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

    const secrets = await secretsManager.listSecrets(params.workspaceId);

    return { secrets };
  })

  // Create or update a secret
  .post(
    "/workspace/:workspaceId",
    async ({ params, body, bearer, set }) => {
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

      try {
        const secret = await secretsManager.setSecret(
          params.workspaceId,
          body.name,
          body.value
        );

        return {
          secret: {
            id: secret.id,
            name: secret.name,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt,
          },
          message: "Secret saved",
        };
      } catch (error) {
        set.status = 400;
        return { error: (error as Error).message };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        value: t.String(),
      }),
    }
  )

  // Delete a secret
  .delete("/workspace/:workspaceId/:name", async ({ params, bearer, set }) => {
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

    const deleted = await secretsManager.deleteSecret(params.workspaceId, params.name);

    if (!deleted) {
      set.status = 404;
      return { error: "Secret not found" };
    }

    return { success: true };
  })

  // Import secrets from .env format
  .post(
    "/workspace/:workspaceId/import",
    async ({ params, body, bearer, set }) => {
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

      try {
        const secrets = await secretsManager.importFromEnv(params.workspaceId, body.envContent);

        return {
          imported: secrets.length,
          secrets: secrets.map((s) => ({ name: s.name })),
        };
      } catch (error) {
        set.status = 400;
        return { error: (error as Error).message };
      }
    },
    {
      body: t.Object({
        envContent: t.String(),
      }),
    }
  )

  // Export secrets to .env format
  .get("/workspace/:workspaceId/export", async ({ params, bearer, set }) => {
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

    const envContent = await secretsManager.exportToEnv(params.workspaceId);

    return { envContent };
  })

  // Inject secrets into running workspace
  .post("/workspace/:workspaceId/inject", async ({ params, bearer, set }) => {
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

    if (workspace.status !== "running") {
      set.status = 400;
      return { error: "Workspace is not running" };
    }

    try {
      await secretsManager.injectSecretsToContainer(params.workspaceId);
      return { success: true, message: "Secrets injected into workspace" };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to inject secrets: ${(error as Error).message}` };
    }
  })

  // Rotate secrets (re-encrypt with new key derivation)
  .post("/workspace/:workspaceId/rotate", async ({ params, bearer, set }) => {
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

    try {
      await secretsManager.rotateSecrets(params.workspaceId);
      return { success: true, message: "Secrets rotated" };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to rotate secrets: ${(error as Error).message}` };
    }
  });
