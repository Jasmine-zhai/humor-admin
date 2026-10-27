/* eslint-disable @next/next/no-img-element */
import { requireAdmin } from "@/lib/admin";
import { Card, PageHeader, timeAgo } from "@/app/components/ui";

type User = {
  id: string; email: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null;
  is_superadmin: boolean; joined_at: string | null; last_sign_in_at: string | null;
  posts: number; likes_given: number; comments: number; chats: number;
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireAdmin();
  const { q = "" } = await searchParams;
  const { data, error } = await supabase.rpc("admin_users");
  if (error) return <p className="text-rose-400">Couldn&apos;t load users: {error.message}</p>;

  const all = (data ?? []) as User[];
  const needle = q.trim().toLowerCase();
  const users = needle
    ? all.filter((u) => `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(needle))
    : all;

  return (
    <>
      <PageHeader title="Users" subtitle={`${all.length} accounts. Names are hidden in the app, but admins can see who's who.`} />
      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email..."
          className="w-full max-w-sm rounded-md bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400/60"
        />
      </form>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-3 font-semibold">User</th>
                <th className="py-2 pr-3 font-semibold">Joined</th>
                <th className="py-2 pr-3 font-semibold">Last seen</th>
                <th className="py-2 pr-3 text-right font-semibold">Memes</th>
                <th className="py-2 pr-3 text-right font-semibold">Likes given</th>
                <th className="py-2 pr-3 text-right font-semibold">Comments</th>
                <th className="py-2 text-right font-semibold">Chats</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "(no name yet)";
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full btn-neon text-xs font-semibold">
                            {(u.first_name?.[0] ?? "") + (u.last_name?.[0] ?? "") || "?"}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-medium text-white">
                            {name}
                            {u.is_superadmin && <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-cyan-300">Admin</span>}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{u.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-400">{u.joined_at ? timeAgo(u.joined_at) : "-"}</td>
                    <td className="py-2.5 pr-3 text-slate-400">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "-"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.posts}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.likes_given}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{u.comments}</td>
                    <td className="py-2.5 text-right tabular-nums">{u.chats}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nobody matches &quot;{q}&quot;.</p>}
        </div>
      </Card>
    </>
  );
}
