import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { parseReview } from "@/lib/reviews/validation";
import { reviewPermit, reviewProtection, verifyTurnstile } from "@/lib/reviews/protection";
import { sameOrigin } from "@/lib/reviews/origin";
import { vendorClient } from "@/lib/supabase/vendor";

const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const protection = reviewProtection();
  if (!protection) return reply({ message: "Review submissions are temporarily unavailable." }, 503);
  if (!sameOrigin(request)) return reply({ message: "Please submit from the Singgah review page." }, 403);
  const vendorAuth = await vendorClient();
  const { data: { user: vendorUser } } = await vendorAuth.auth.getUser();
  if (vendorUser && !vendorUser.is_anonymous) return reply({ message: "Sign out of your vendor account before leaving a customer review." }, 403);
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ") || bearer.length > 8192) return reply({ message: "Please retry to restore your customer session." }, 401);
  // Bound the actual body, including requests that omit Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return reply({ message: "Please check your review." }, 400);
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) { await reader.cancel(); return reply({ message: "Your review is too large." }, 413); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return reply({ message: "Please check your review." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ message: "Please check your review." }, 400);
    if (Object.keys(body).some((key) => !["review", "turnstileToken"].includes(key))) return reply({ message: "Unexpected submission fields." }, 400);
    let review;
    try { review = parseReview(body.review); } catch (error) { return reply({ message: (error as Error).message }, 400); }
    const { url, key } = getSupabaseConfig();
    const client = createClient<Database>(url, key, { global: { headers: { Authorization: bearer } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await client.auth.getUser(bearer.slice(7));
    if (authError || !auth.user) return reply({ message: "Please retry to restore your customer session." }, 401);
    const existing = await client.rpc("has_reviewed_vendor", { p_vendor_id: review.vendorId });
    if (existing.error) return reply({ message: "We couldn’t check your review. Please try again." }, 503);
    if (existing.data) return reply({ code: "already_reviewed", message: "You’ve already reviewed this vendor." }, 409);
    if (typeof body.turnstileToken !== "string" || !await verifyTurnstile(body.turnstileToken, protection)) return reply({ message: "Please complete the security check again." }, 400);
    const permit = reviewPermit(review, auth.user.id, protection.signingSecret);
    const result = await client.rpc("submit_customer_review", { p_payload: permit.payload, p_signature: permit.signature });
    if (result.error) {
      if (result.error.message === "already_reviewed" || result.error.code === "23505") return reply({ code: "already_reviewed", message: "You’ve already reviewed this vendor." }, 409);
      if (result.error.message === "vendor_unavailable") return reply({ message: "This vendor is no longer available." }, 404);
      if (result.error.message === "review_rate_limited") return reply({ message: "You’ve shared several reviews recently. Please try again in an hour." }, 429);
      return reply({ message: "We couldn’t save your review. Check the selected products and try again." }, 400);
    }
    return reply({ success: true }, 201);
  } catch { return reply({ message: "We couldn’t submit your review. Please try again in a moment." }, 503); }
}
