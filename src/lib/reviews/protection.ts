import { REVIEW_TERMS_VERSION } from "./terms.ts";
import "server-only";
import { createHmac } from "node:crypto";
import type { ReviewInput } from "./validation";

export function reviewProtection() {
  const test = process.env.TURNSTILE_TEST_MODE === "true" && process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  const siteKey = test ? "1x00000000000000000000AA" : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = test ? "1x0000000000000000000000000000000AA" : process.env.TURNSTILE_SECRET_KEY;
  const signingSecret = process.env.REVIEW_SUBMISSION_SECRET;
  const hosts = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "").split(",").map((host) => host.trim()).filter(Boolean);
  const dummy = (value: string) => /^[123]x0{10,}/.test(value);
  if (!siteKey || !secret || !signingSecret || !/^[a-f0-9]{64}$/.test(signingSecret) || (!test && (!hosts.length || dummy(siteKey) || dummy(secret)))) return null;
  return { test, siteKey, secret, signingSecret, hosts };
}

export async function verifyTurnstile(token: string, protection: NonNullable<ReturnType<typeof reviewProtection>>) {
  if (!token || token.length > 2048) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", body: new URLSearchParams({ secret: protection.secret, response: token }),
    cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return false;
  const data = await response.json();
  return data.success === true && (protection.test || (data.action === "review" && protection.hosts.includes(data.hostname)));
}

export function reviewPermit(input: ReviewInput, customerId: string, secret: string) {
  const payload = JSON.stringify({ ...input, termsVersion: REVIEW_TERMS_VERSION, customerId, expires: Math.floor(Date.now() / 1000) + 120 });
  return { payload, signature: createHmac("sha256", secret).update(payload).digest("hex") };
}
