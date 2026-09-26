import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { parse } from "pgsql-parser";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const mode = process.argv[2];
const directory = "supabase/migrations";
const migrations = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
const read = (name) => readFileSync(name, "utf8");

async function main() {
  if (mode === "validate") {
    for (const file of [...migrations.map((name) => path.join(directory, name)), "supabase/seed.sql", "supabase/tests/integrity.sql"]) {
      await parse(read(file));
      console.log(`SQL parsed: ${file}`);
    }
    console.log("Syntax only: SQL parsing does not execute constraints, policies, or PL/pgSQL bodies. Run db:test against migrated Singgah Dev.");
    return;
  }
  if (!["migrate", "seed", "test"].includes(mode)) throw new Error("Expected validate, migrate, seed or test.");
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required in ignored .env.local for hosted database operations.");
  const target = new URL(connectionString);
  const project = "yclwktzpthezflzhoeuk";
  const direct = target.hostname === `db.${project}.supabase.co`;
  const pooler = target.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(target.username) === `postgres.${project}`;
  if (!["postgres:", "postgresql:"].includes(target.protocol) || (!direct && !pooler)) {
    throw new Error("Refusing database operation: connection must target the approved Singgah Dev project.");
  }
  // Always verify TLS; no rejectUnauthorized=false workaround.
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) target.searchParams.delete(key);
  const ca = read("supabase/certs/prod-ca-2021.crt");
  const client = new pg.Client({ connectionString: target.toString(), ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    await client.query("select pg_advisory_xact_lock(728419001)");
    if (mode === "migrate") {
      await client.query("create schema if not exists private; revoke all on schema private from public, anon, authenticated");
      await client.query("create table if not exists private.singgah_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())");
      await client.query("revoke all on private.singgah_migrations from public, anon, authenticated");
      for (const name of migrations) {
        const sql = read(path.join(directory, name));
        const checksum = createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex");
        const { rows } = await client.query("select checksum from private.singgah_migrations where name = $1", [name]);
        if (rows.length) {
          if (rows[0].checksum !== checksum) throw new Error(`Applied migration was edited: ${name}`);
          console.log(`Already applied: ${name}`);
        } else {
          await client.query(sql);
          await client.query("insert into private.singgah_migrations(name, checksum) values ($1, $2)", [name, checksum]);
          console.log(`Applied: ${name}`);
        }
      }
    } else {
      await client.query(read(mode === "seed" ? "supabase/seed.sql" : "supabase/tests/integrity.sql"));
    }
    await client.query(mode === "test" ? "rollback" : "commit");
    console.log(mode === "test" ? "PASS: hosted integrity/RLS checks; all test writes rolled back." : `Completed ${mode}.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { await client.end(); }
}

main().catch((error) => {
  // Avoid printing connection URLs or SQL details containing credentials/data.
  console.error(error.code ? `Database operation failed (${error.code}). Check target access, schema and credentials.` : error.message);
  process.exitCode = 1;
});
