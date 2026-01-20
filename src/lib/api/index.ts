import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { workspaceRoutes } from "./routes/workspaces";
import { sessionRoutes } from "./routes/sessions";
import { appsRoutes } from "./routes/apps";
import { workflowRoutes } from "./routes/workflows";
import { secretsRoutes } from "./routes/secrets";
import { githubRoutes } from "./routes/github";

export const api = new Elysia({ prefix: "/api" })
  .use(cors())
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authRoutes)
  .use(workspaceRoutes)
  .use(sessionRoutes)
  .use(appsRoutes)
  .use(workflowRoutes)
  .use(secretsRoutes)
  .use(githubRoutes);

export type Api = typeof api;
