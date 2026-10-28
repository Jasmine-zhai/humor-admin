import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// Every admin page and action calls this first.
// Not logged in -> /login. Logged in but profiles.is_superadmin isn't true -> /not-allowed.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_superadmin").eq("id", user.id).maybeSingle();
  if (!profile?.is_superadmin) redirect("/not-allowed");

  return { supabase, user };
}
