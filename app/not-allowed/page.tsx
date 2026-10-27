import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

// Logged in, but profiles.is_superadmin isn't true for this account.
export default async function NotAllowed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_superadmin");
  if (isAdmin) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl panel-strong p-8 text-center">
        <p className="text-5xl">🚫</p>
        <h1 className="mt-4 text-2xl font-extrabold text-white">Nice try</h1>
        <p className="mt-2 text-slate-400">
          You&apos;re signed in as <span className="font-semibold text-slate-200">{user.email}</span>, but this account isn&apos;t an
          admin. Only accounts with <code className="rounded bg-black/40 px-1 text-cyan-300">is_superadmin</code> turned on can come in.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="w-full rounded-md btn-neon py-2.5 font-semibold">Sign out</button>
        </form>
      </div>
    </main>
  );
}
