import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { workspaces, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "./auth";
import { githubManager } from "@/lib/github";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;

export const githubRoutes = new Elysia({ prefix: "/github" })
  .use(bearer())
  // Get GitHub OAuth URL
  .get("/auth/url", async ({ bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!GITHUB_CLIENT_ID) {
      set.status = 500;
      return { error: "GitHub OAuth not configured" };
    }

    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64");
    const redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/api/github/auth/callback`;

    const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user,user:email&state=${state}`;

    return { url };
  })

  // Handle OAuth callback
  .get("/auth/callback", async ({ query, set }) => {
    const { code, state } = query;

    if (!code || !state) {
      set.status = 400;
      return { error: "Missing code or state" };
    }

    try {
      // Decode state to get user ID
      const stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
      const userId = stateData.userId;

      // Exchange code for token
      const { accessToken } = await githubManager.exchangeCodeForToken(code as string);

      // Get GitHub user info
      const octokit = githubManager.getUserOctokit(accessToken);
      const githubUser = await githubManager.getUser(octokit);

      // Store GitHub credentials (in production, encrypt the token)
      await db
        .update(users)
        .set({
          githubId: githubUser.id.toString(),
          githubUsername: githubUser.login,
          githubAccessToken: accessToken, // Should be encrypted in production
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Redirect to dashboard
      set.redirect = "/dashboard/settings?github=connected";
      return { success: true };
    } catch (error) {
      set.status = 500;
      return { error: `GitHub OAuth failed: ${(error as Error).message}` };
    }
  })

  // Get current user's GitHub profile
  .get("/me", async ({ bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [dbUser] = await db
      .select({
        githubId: users.githubId,
        githubUsername: users.githubUsername,
        githubAccessToken: users.githubAccessToken,
      })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser?.githubAccessToken) {
      set.status = 404;
      return { error: "GitHub not connected" };
    }

    try {
      const octokit = githubManager.getUserOctokit(dbUser.githubAccessToken);
      const githubUser = await githubManager.getUser(octokit);

      return { github: githubUser };
    } catch (error) {
      set.status = 500;
      return { error: "Failed to fetch GitHub profile" };
    }
  })

  // Disconnect GitHub
  .delete("/disconnect", async ({ bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await db
      .update(users)
      .set({
        githubId: null,
        githubUsername: null,
        githubAccessToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { success: true };
  })

  // List repositories
  .get("/repos", async ({ query, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [dbUser] = await db
      .select({ githubAccessToken: users.githubAccessToken })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser?.githubAccessToken) {
      set.status = 400;
      return { error: "GitHub not connected" };
    }

    try {
      const octokit = githubManager.getUserOctokit(dbUser.githubAccessToken);
      const repos = await githubManager.listRepositories(
        octokit,
        parseInt(query.page as string) || 1,
        parseInt(query.perPage as string) || 30
      );

      return { repositories: repos };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to list repositories: ${(error as Error).message}` };
    }
  })

  // Get repository details
  .get("/repos/:owner/:repo", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [dbUser] = await db
      .select({ githubAccessToken: users.githubAccessToken })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser?.githubAccessToken) {
      set.status = 400;
      return { error: "GitHub not connected" };
    }

    try {
      const octokit = githubManager.getUserOctokit(dbUser.githubAccessToken);
      const repo = await githubManager.getRepository(octokit, params.owner, params.repo);

      return { repository: repo };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to get repository: ${(error as Error).message}` };
    }
  })

  // List branches
  .get("/repos/:owner/:repo/branches", async ({ params, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [dbUser] = await db
      .select({ githubAccessToken: users.githubAccessToken })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser?.githubAccessToken) {
      set.status = 400;
      return { error: "GitHub not connected" };
    }

    try {
      const octokit = githubManager.getUserOctokit(dbUser.githubAccessToken);
      const branches = await githubManager.listBranches(octokit, params.owner, params.repo);

      return { branches };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to list branches: ${(error as Error).message}` };
    }
  })

  // Clone repository into workspace
  .post(
    "/clone",
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

      if (workspace.status !== "running") {
        set.status = 400;
        return { error: "Workspace is not running" };
      }

      const [dbUser] = await db
        .select({ githubAccessToken: users.githubAccessToken })
        .from(users)
        .where(eq(users.id, user.id));

      try {
        const result = await githubManager.cloneRepository(
          body.workspaceId,
          body.repoUrl,
          body.targetDir || "/home/dev/projects",
          {
            branch: body.branch,
            depth: body.depth,
            accessToken: dbUser?.githubAccessToken || undefined,
          }
        );

        if (result.exitCode !== 0) {
          set.status = 500;
          return { error: `Clone failed: ${result.output}` };
        }

        return { success: true, output: result.output };
      } catch (error) {
        set.status = 500;
        return { error: `Clone failed: ${(error as Error).message}` };
      }
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        repoUrl: t.String(),
        targetDir: t.Optional(t.String()),
        branch: t.Optional(t.String()),
        depth: t.Optional(t.Number()),
      }),
    }
  )

  // Create pull request from workspace
  .post(
    "/pr",
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

      if (workspace.status !== "running") {
        set.status = 400;
        return { error: "Workspace is not running" };
      }

      const [dbUser] = await db
        .select({ githubAccessToken: users.githubAccessToken })
        .from(users)
        .where(eq(users.id, user.id));

      if (!dbUser?.githubAccessToken) {
        set.status = 400;
        return { error: "GitHub not connected" };
      }

      try {
        const pr = await githubManager.createPRFromWorkspace(
          body.workspaceId,
          body.repoPath,
          dbUser.githubAccessToken,
          {
            owner: body.owner,
            repo: body.repo,
            title: body.title,
            body: body.body,
            branch: body.branch,
            base: body.base,
          }
        );

        return { pullRequest: pr };
      } catch (error) {
        set.status = 500;
        return { error: `Failed to create PR: ${(error as Error).message}` };
      }
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        repoPath: t.String(),
        owner: t.String(),
        repo: t.String(),
        title: t.String(),
        body: t.String(),
        branch: t.String(),
        base: t.Optional(t.String()),
      }),
    }
  )

  // List pull requests
  .get("/repos/:owner/:repo/pulls", async ({ params, query, bearer, set }) => {
    const user = await getAuthUser(bearer);
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const [dbUser] = await db
      .select({ githubAccessToken: users.githubAccessToken })
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser?.githubAccessToken) {
      set.status = 400;
      return { error: "GitHub not connected" };
    }

    try {
      const octokit = githubManager.getUserOctokit(dbUser.githubAccessToken);
      const prs = await githubManager.listPullRequests(
        octokit,
        params.owner,
        params.repo,
        (query.state as "open" | "closed" | "all") || "open"
      );

      return { pullRequests: prs };
    } catch (error) {
      set.status = 500;
      return { error: `Failed to list PRs: ${(error as Error).message}` };
    }
  })

  // Setup Git config in workspace
  .post(
    "/setup-git",
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

      if (workspace.status !== "running") {
        set.status = 400;
        return { error: "Workspace is not running" };
      }

      try {
        await githubManager.setupGitConfig(body.workspaceId, body.name, body.email);
        return { success: true };
      } catch (error) {
        set.status = 500;
        return { error: `Failed to setup Git: ${(error as Error).message}` };
      }
    },
    {
      body: t.Object({
        workspaceId: t.String(),
        name: t.String(),
        email: t.String(),
      }),
    }
  );
