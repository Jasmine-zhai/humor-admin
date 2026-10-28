/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { Bars, Card, PageHeader, Stat, timeAgo } from "@/app/components/ui";

type Resp = { processing_time_seconds: number; created_datetime_utc: string; llm_models: { name: string } | null; humor_flavors: { slug: string } | null };
type Cap = { id: string; content: string | null; like_count: number; images: { url: string } | null; humor_flavors: { slug: string } | null };

export default async function Overview() {
  const { supabase } = await requireAdmin();
  const count = async (table: string) => (await supabase.from(table).select("*", { count: "estimated", head: true })).count ?? 0;

  const [users, captions, images, requests, responses, chains, recent, topCaptions] = await Promise.all([
    count("profiles"),
    count("captions"),
    count("images"),
    count("caption_requests"),
    count("llm_model_responses"),
    count("humor_flavors"),
    supabase
      .from("llm_model_responses")
      .select("processing_time_seconds, created_datetime_utc, llm_models(name), humor_flavors(slug)")
      .order("created_datetime_utc", { ascending: false })
      .limit(1000),
    supabase
      .from("captions")
      .select("id, content, like_count, images(url), humor_flavors(slug)")
      .order("like_count", { ascending: false })
      .limit(3),
  ]);

  const rs = (recent.data ?? []) as unknown as Resp[];
  // average LLM time per model, and how often each prompt chain ran, over the latest 1,000 LLM calls
  const byModel = new Map<string, { total: number; n: number }>();
  const byChain = new Map<string, number>();
  for (const r of rs) {
    const m = r.llm_models?.name ?? "unknown";
    const cur = byModel.get(m) ?? { total: 0, n: 0 };
    byModel.set(m, { total: cur.total + r.processing_time_seconds, n: cur.n + 1 });
    const c = r.humor_flavors?.slug ?? "unknown";
    byChain.set(c, (byChain.get(c) ?? 0) + 1);
  }
  const modelRows = [...byModel.entries()]
    .map(([label, v]) => ({ label, value: Math.round((v.total / v.n) * 10) / 10 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const chainRows = [...byChain.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const avg = rs.length ? Math.round((rs.reduce((s, r) => s + r.processing_time_seconds, 0) / rs.length) * 10) / 10 : 0;
  const slowest = rs.length ? Math.max(...rs.map((r) => r.processing_time_seconds)) : 0;
  const top = (topCaptions.data ?? []) as unknown as Cap[];

  return (
    <>
      <PageHeader title="Overview" subtitle="How the caption pipeline is doing, straight from the course database." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Users" value={users.toLocaleString()} />
        <Stat label="AI captions" value={captions.toLocaleString()} hint={`for ${images.toLocaleString()} images`} />
        <Stat label="Generation requests" value={requests.toLocaleString()} />
        <Stat label="LLM calls" value={responses.toLocaleString()} />
        <Stat label="Prompt chains" value={chains.toLocaleString()} />
        <Stat label="Avg LLM call" value={`${avg}s`} hint={`slowest ${slowest}s, last ${rs.length.toLocaleString()} calls`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Which models are slowest" note="Average seconds per call, latest 1,000 LLM calls">
          <Bars rows={modelRows} unit="s" />
        </Card>
        <Card title="Busiest prompt chains" note="LLM calls per prompt chain, latest 1,000 calls">
          <Bars rows={chainRows} />
        </Card>
      </div>

      <Card title="Most liked AI captions" className="mt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {top.map((c, i) => (
            <figure key={c.id} className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
              {c.images?.url && <img src={c.images.url} alt="" className="aspect-square w-full object-cover" />}
              <figcaption className="p-3 text-sm">
                <p className="text-slate-200">{["🥇", "🥈", "🥉"][i]} {c.content}</p>
                <p className="mt-2 text-xs text-slate-500">{c.like_count.toLocaleString()} likes · {c.humor_flavors?.slug ?? "unknown chain"}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Card>

      {rs[0] && (
        <p className="mt-4 text-xs text-slate-500">
          Latest LLM call {timeAgo(rs[0].created_datetime_utc)}. <Link href="/llm-responses" className="text-cyan-300 hover:underline">See all LLM responses</Link>
        </p>
      )}
    </>
  );
}
