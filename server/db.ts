import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon serverless HTTP driver: stateless (no socket/pool held open), so a
// module-scope singleton is safe across warm/Fluid serverless invocations.
// DATABASE_URL must be Neon's POOLED (-pooler) connection string at runtime.
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });
