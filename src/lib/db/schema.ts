import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  // GitHub OAuth integration
  githubId: text("github_id"),
  githubUsername: text("github_username"),
  githubAccessToken: text("github_access_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organizations table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization members
export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"), // owner, admin, member
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workspaces table
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  orgId: uuid("org_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("stopped"), // creating, running, stopped, suspended, error
  containerId: text("container_id"),
  image: text("image").notNull().default("termflux-workspace:latest"),
  volumeId: text("volume_id"),
  nodeId: text("node_id"),
  cpuLimit: integer("cpu_limit").default(2), // CPU cores
  memoryLimit: integer("memory_limit").default(2048), // MB
  diskLimit: integer("disk_limit").default(10240), // MB
  env: jsonb("env").default({}), // Environment variables
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Terminal sessions table
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // Use nanoid instead of UUID for session IDs
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: text("name").notNull().default("Terminal"),
  status: text("status").notNull().default("active"), // active, disconnected, terminated
  ptyPid: integer("pty_pid"),
  tmuxSession: text("tmux_session"),
  tmuxWindow: integer("tmux_window").default(0),
  shellPath: text("shell_path").default("/bin/bash"),
  cols: integer("cols").default(120),
  rows: integer("rows").default(40),
  lastSeenAt: timestamp("last_seen_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Window layouts for the multi-window terminal UI
export const windowLayouts = pgTable("window_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  layout: jsonb("layout").notNull(), // JSON structure for window positions, sizes, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Apps table (for the app marketplace)
export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  manifest: jsonb("manifest").notNull(), // App manifest JSON
  version: text("version").notNull().default("1.0.0"),
  isPublic: boolean("is_public").default(true),
  authorId: uuid("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workspace apps (installed apps per workspace)
export const workspaceApps = pgTable("workspace_apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  appId: uuid("app_id").references(() => apps.id).notNull(),
  config: jsonb("config"), // App-specific configuration
  installedAt: timestamp("installed_at").defaultNow().notNull(),
});

// Workflows table
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  definition: jsonb("definition").notNull(), // Workflow steps definition
  env: jsonb("env").default({}), // Workflow-level environment variables
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workflow runs table
export const workflowRuns = pgTable("workflow_runs", {
  id: text("id").primaryKey(), // Use nanoid for run IDs
  workflowId: uuid("workflow_id").references(() => workflows.id).notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, cancelled
  steps: jsonb("steps").default([]), // Step execution results
  logs: text("logs"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Encrypted secrets table (per workspace)
export const secrets = pgTable("secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  name: text("name").notNull(), // e.g., API_KEY, DATABASE_URL
  encryptedValue: text("encrypted_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auth sessions (for user authentication)
export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  isValid: boolean("is_valid").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizations),
  workspaces: many(workspaces),
  authSessions: many(authSessions),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
  members: many(orgMembers),
  workspaces: many(workspaces),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  org: one(organizations, { fields: [workspaces.orgId], references: [organizations.id] }),
  user: one(users, { fields: [workspaces.userId], references: [users.id] }),
  sessions: many(sessions),
  apps: many(workspaceApps),
  workflows: many(workflows),
  secrets: many(secrets),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  workspace: one(workspaces, { fields: [sessions.workspaceId], references: [workspaces.id] }),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [workflows.workspaceId], references: [workspaces.id] }),
  runs: many(workflowRuns),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  workflow: one(workflows, { fields: [workflowRuns.workflowId], references: [workflows.id] }),
  workspace: one(workspaces, { fields: [workflowRuns.workspaceId], references: [workspaces.id] }),
}));

export const secretsRelations = relations(secrets, ({ one }) => ({
  workspace: one(workspaces, { fields: [secrets.workspaceId], references: [workspaces.id] }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));
