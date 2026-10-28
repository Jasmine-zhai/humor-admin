import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getResource } from "@/lib/resources";
import { PageHeader } from "@/app/components/ui";
import ResourceTable from "./ResourceTable";

const PAGE_SIZE = 25;

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { resource: slug } = await params;
  const r = getResource(slug);
  if (!r) notFound();
  const { supabase } = await requireAdmin();

  const { page: pageParam, q = "" } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase.from(r.table).select(r.select, { count: "estimated" });
  if (q.trim() && r.searchKey) query = query.ilike(r.searchKey, `%${q.trim()}%`);
  query = r.orderBy
    ? query.order(r.orderBy, { ascending: true }).order("id", { ascending: true })
    : query.order("created_datetime_utc", { ascending: false });
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/${slug}?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const actions = [r.canCreate && "create", "read", r.canUpdate && "update", r.canDelete && "delete"].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader title={r.title} subtitle={r.description} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {r.searchKey && (
          <form className="min-w-0 flex-1">
            <input
              name="q"
              defaultValue={q}
              placeholder={`Search ${r.title.toLowerCase()}...`}
              className="w-full max-w-sm rounded-md bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400/60"
            />
          </form>
        )}
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">
          {total.toLocaleString()} rows · {actions}
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">Couldn&apos;t load this table: {error.message}</p>
      ) : (
        <ResourceTable
          slug={r.slug}
          fields={r.fields}
          rows={(data ?? []) as unknown as Record<string, unknown>[]}
          canCreate={!!r.canCreate}
          canUpdate={!!r.canUpdate}
          canDelete={!!r.canDelete}
          upload={!!r.upload}
          idKey={r.idKey ?? "id"}
        />
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          {page > 1 ? <Link href={link(page - 1)} className="rounded-md px-3 py-1.5 hover:bg-white/10">← Newer</Link> : <span />}
          <span>Page {page} of {pages.toLocaleString()}</span>
          {page < pages ? <Link href={link(page + 1)} className="rounded-md px-3 py-1.5 hover:bg-white/10">Older →</Link> : <span />}
        </div>
      )}
    </>
  );
}
