import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// Every admin page and action calls this first.
// Not logged in -> /login. Logged in but profiles.is_superadmin is false -> /not-allowed.
// The database functions check is_superadmin again, so the data stays locked even if this were skipped.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_superadmin");
  if (!isAdmin) redirect("/not-allowed");

  return { supabase, user };
}
