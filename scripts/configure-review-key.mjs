import { readFileSync, writeFileSync } from "node:fs";
import { reviewDatabase } from "./review-db-client.mjs";

const db = await reviewDatabase();
try {
  const { rows } = await db.query("select signing_secret from private.review_submission_config where singleton");
  if (!rows[0]?.signing_secret) throw new Error("Apply the review migration first.");
  const original = readFileSync(".env.local", "utf8");
  const entry = `REVIEW_SUBMISSION_SECRET=${rows[0].signing_secret}`;
  const next = /^REVIEW_SUBMISSION_SECRET=.*$/m.test(original) ? original.replace(/^REVIEW_SUBMISSION_SECRET=.*$/m, entry) : `${original.trimEnd()}\n${entry}\n`;
  writeFileSync(".env.local", next);
  console.log("Configured the database-generated review signing key in ignored .env.local. No secret printed.");
} finally { await db.end(); }
