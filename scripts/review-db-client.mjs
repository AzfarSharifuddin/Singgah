import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

export async function reviewDatabase() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required.");
  const target = new URL(process.env.SUPABASE_DB_URL);
  const project = "yclwktzpthezflzhoeuk";
  if (!["postgres:", "postgresql:"].includes(target.protocol) || !(target.hostname === `db.${project}.supabase.co` || (target.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(target.username) === `postgres.${project}`))) throw new Error("Expected Singgah Dev database.");
  for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) target.searchParams.delete(key);
  const client = new pg.Client({ connectionString: target.toString(), ssl: { rejectUnauthorized: true, ca: readFileSync("supabase/certs/prod-ca-2021.crt", "utf8") }, connectionTimeoutMillis: 15000 });
  await client.connect();
  return client;
}
