import { NextResponse } from "next/server";
import { vendorClient } from "@/lib/supabase/vendor";
export async function GET(request: Request) {
  const url = new URL(request.url);
  // The invitation has a fixed production destination, even behind a proxy.
  const origin = process.env.NODE_ENV === "production" ? "https://singgah.cc" : url.origin;
  const client = await vendorClient();
  const token = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  let verified = false;
  if (token && token.length <= 512) {
    const { error } = await client.auth.verifyOtp({ token_hash: token, type: "invite" });
    verified = !error;
  } else if (code && code.length <= 512) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    verified = !error;
  }
  const response = NextResponse.redirect(new URL(verified ? "/admin/password" : "/admin/login?invitation=retry", origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
