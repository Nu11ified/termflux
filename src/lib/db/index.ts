import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// Create a lazy database connection that only connects when needed
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!_db) {
    const client = postgres(connectionString);
    _db = drizzle(client, { schema });
  }

  return _db;
}

// Export a proxy that lazily initializes the database
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});

export type Database = typeof db;
