import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Programmatic migrator (alternative to `drizzle-kit migrate`), handy in CI or
// anywhere you want a node-postgres connection over the direct/unpooled URL.
// The Vercel build uses `npm run db:migrate` (drizzle-kit); this is optional.

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set.");
}

async function main() {
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, {
    migrationsFolder: "./migrations",
    migrationsSchema: "drizzle",
    migrationsTable: "__drizzle_migrations",
  });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
