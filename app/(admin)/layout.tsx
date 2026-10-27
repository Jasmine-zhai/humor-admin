import { requireAdmin } from "@/lib/admin";
import Nav from "./Nav";

// Every page inside (admin) goes through this check first.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="panel border-y-0 border-l-0 md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col">
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md btn-neon text-sm font-black">M</span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight text-neon">Control Room</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Memeside Heights</span>
          </span>
        </div>
        <Nav />
        <div className="hidden border-t border-white/10 p-3 md:mt-auto md:block">
          <p className="truncate px-1 text-xs text-slate-500" title={user.email}>{user.email}</p>
          <form action="/auth/signout" method="post">
            <button className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-400 hover:bg-white/10 hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
