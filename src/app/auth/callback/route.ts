import { NextResponse } from "next/server";
import { vendorClient } from "@/lib/supabase/vendor";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Preserve the actual external host rather than Next's internal localhost.
  url.host = request.headers.get("host") || url.host;
  const code = url.searchParams.get("code");
  if (code) {
    const client = await vendorClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/vendor/login?confirmation=retry", url.origin));
}
