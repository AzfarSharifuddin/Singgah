import { NextResponse } from "next/server";
import { vendorClient } from "@/lib/supabase/vendor";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NODE_ENV === "production" ? "https://singgah.cc" : url.origin;
  const token = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const client = await vendorClient();
  let verified = false;

  if (type === "recovery" && token && token.length <= 512) {
    const result = await client.auth.verifyOtp({ token_hash: token, type: "recovery" });
    if (!result.error && result.data.user && !result.data.user.is_anonymous && result.data.user.email_confirmed_at) {
      const permission = await client.rpc("is_singgah_admin");
      verified = !permission.error && permission.data === true;
    }
  }

  if (!verified) await client.auth.signOut({ scope: "local" });
  const response = NextResponse.redirect(new URL(verified ? "/admin/password" : "/admin/login?password=retry", origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
