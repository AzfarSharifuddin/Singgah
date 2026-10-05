import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { vendorClient } from "@/lib/supabase/vendor";

export const adminSession = cache(async () => {
  const client = await vendorClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.is_anonymous || !user.email_confirmed_at) redirect("/admin/login");
  const { data: allowed, error: permissionError } = await client.rpc("is_singgah_admin");
  if (permissionError) throw new Error("Admin access could not be checked. Please retry or contact Singgah.");
  if (!allowed) redirect("/admin/login?access=denied");
  return { client, user };
});
