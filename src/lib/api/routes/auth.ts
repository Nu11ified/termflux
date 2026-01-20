import { Elysia, t } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { db } from "@/lib/db";
import { users, authSessions, organizations, orgMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "@/lib/utils";

// Simple password hashing using Web Crypto API (available in both browser and server)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(bearer())
  // Register a new user
  .post(
    "/register",
    async ({ body, set }) => {
      const { email, password, name } = body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        set.status = 400;
        return { error: "User with this email already exists" };
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash,
        })
        .returning();

      if (!newUser) {
        set.status = 500;
        return { error: "Failed to create user" };
      }

      // Create default organization for the user
      const slug = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "-") || generateId("org");

      const [org] = await db
        .insert(organizations)
        .values({
          name: `${name}'s Workspace`,
          slug,
          ownerId: newUser.id,
        })
        .returning();

      if (org) {
        // Add user as owner of the org
        await db.insert(orgMembers).values({
          orgId: org.id,
          userId: newUser.id,
          role: "owner",
        });
      }

      // Create auth session
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.insert(authSessions).values({
        userId: newUser.id,
        token,
        expiresAt,
      });

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        token,
        expiresAt: expiresAt.toISOString(),
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        name: t.String({ minLength: 1 }),
      }),
    }
  )

  // Login
  .post(
    "/login",
    async ({ body, set }) => {
      const { email, password } = body;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        set.status = 401;
        return { error: "Invalid email or password" };
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        set.status = 401;
        return { error: "Invalid email or password" };
      }

      // Create new session
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(authSessions).values({
        userId: user.id,
        token,
        expiresAt,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        token,
        expiresAt: expiresAt.toISOString(),
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )

  // Get current user
  .get("/me", async ({ bearer, set }) => {
    if (!bearer) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const session = await db.query.authSessions.findFirst({
      where: eq(authSessions.token, bearer),
    });

    if (!session || session.expiresAt < new Date()) {
      set.status = 401;
      return { error: "Session expired or invalid" };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) {
      set.status = 404;
      return { error: "User not found" };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
    };
  })

  // Logout
  .post("/logout", async ({ bearer, set }) => {
    if (!bearer) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    await db.delete(authSessions).where(eq(authSessions.token, bearer));

    return { success: true };
  });

// Auth middleware helper
export async function getAuthUser(token: string | undefined) {
  if (!token) return null;

  const session = await db.query.authSessions.findFirst({
    where: eq(authSessions.token, token),
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  return user;
}
