import { defineConfig } from "drizzle-kit";

// DDL / migrations must run over a DIRECT (unpooled) connection — PgBouncer
// transaction pooling breaks multi-statement DDL. Neon injects
// DATABASE_URL_UNPOOLED; fall back to DATABASE_URL for local/dev.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL_UNPOOLED or DATABASE_URL must be set for drizzle-kit.",
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
});
