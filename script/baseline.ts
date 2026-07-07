import pg from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// One-time, idempotent baseline. Marks migration 0000 as ALREADY APPLIED so a
// database that already has the schema (e.g. prod data imported via pg_dump)
// does not try to re-run its CREATE TABLE statements.
//
// Only run this when the target DB already has the tables. On a FRESH database,
// skip it entirely — `db:migrate` will run 0000 and create everything.
//
// The drizzle migrator dedupes by created_at (the journal `when` millis) DESC,
// NOT by hash — so the baseline row MUST carry the journal's `when` value.
// A null/0 created_at sorts before 0000 and the migrator re-runs it.

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set.");
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

async function main() {
  const journalRaw = await readFile(
    path.join(MIGRATIONS_DIR, "meta", "_journal.json"),
    "utf-8",
  );
  const journal = JSON.parse(journalRaw) as {
    entries: { idx: number; when: number; tag: string }[];
  };
  const first = journal.entries.find((e) => e.idx === 0);
  if (!first) throw new Error("No 0000 migration found in the journal.");

  const sqlText = await readFile(
    path.join(MIGRATIONS_DIR, `${first.tag}.sql`),
    "utf-8",
  );
  const hash = createHash("sha256").update(sqlText).digest("hex");

  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await pool.query(
      `CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
         id SERIAL PRIMARY KEY,
         hash text NOT NULL,
         created_at bigint
       )`,
    );
    const existing = await pool.query(
      "SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1",
      [hash],
    );
    if ((existing.rowCount ?? 0) > 0) {
      console.log("Baseline already recorded; nothing to do.");
      return;
    }
    await pool.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash, first.when],
    );
    console.log(`Baseline recorded: ${first.tag} (created_at=${first.when}).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
