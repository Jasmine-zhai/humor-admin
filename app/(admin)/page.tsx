/* eslint-disable @next/next/no-img-element */
import { requireAdmin } from "@/lib/admin";
import { Bars, Card, Columns, PageHeader, Stat } from "@/app/components/ui";

type Stats = {
  totals: { users: number; posts: number; drafts: number; captions: number; likes: number; comments: number; topics: number; old_votes: number };
  pick_position: { position: number; count: number }[];
  topics: { name: string; posts: number; likes: number; members: number }[];
  models: { model: string; count: number }[];
  hours: { hour: number; count: number }[];
  caption_length: { chosen: number | null; not_chosen: number | null };
  with_idea: { with: number; without: number };
  top_posts: { id: number; image_url: string; topic: string; caption: string | null; likes: number; comments: number }[];
};

const ORDINAL = ["1st", "2nd", "3rd"];
const hourLabel = (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

export default async function Overview() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: gens }, { data: calls }] = await Promise.all([
    supabase.rpc("admin_stats"),
    supabase.from("generation_requests").select("status, model, duration_ms, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("llm_responses").select("model, status_code, duration_ms").order("created_at", { ascending: false }).limit(1000),
  ]);
  const genRows = (gens ?? []) as { status: string; model: string | null; duration_ms: number | null }[];
  const callRows = (calls ?? []) as { model: string; status_code: number | null; duration_ms: number | null }[];
  const succeeded = genRows.filter((g) => g.status === "succeeded").length;
  const timed = genRows.map((g) => g.duration_ms).filter((d): d is number => typeof d === "number").sort((a, b) => a - b);
  const medianSeconds = timed.length ? Math.round(timed[Math.floor(timed.length / 2)] / 100) / 10 : null;
  const winners = new Map<string, number>();
  for (const g of genRows) if (g.status === "succeeded" && g.model) winners.set(g.model, (winners.get(g.model) ?? 0) + 1);
  const failedCalls = callRows.filter((c) => c.status_code !== 200).length;
  if (error || !data) return <p className="text-rose-400">Couldn&apos;t load stats: {error?.message}</p>;
  const s = data as Stats;
  const t = s.totals;

  const started = t.posts + t.drafts;
  const totalPicks = s.pick_position.reduce((a, b) => a + b.count, 0);
  const busiest = [...s.hours].sort((a, b) => b.count - a.count)[0];
  const ideaPosts = s.with_idea.with + s.with_idea.without;

  return (
    <>
      <PageHeader title="Overview" subtitle="What's going on in Memeside Heights, straight from the database." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={t.users} />
        <Stat label="Memes posted" value={t.posts} hint={`${t.drafts} abandoned drafts`} />
        <Stat label="AI captions" value={t.captions} hint={`${t.posts ? (t.captions / Math.max(1, started)).toFixed(1) : 0} per meme`} />
        <Stat label="Likes" value={t.likes} hint={`${t.comments} comments · ${t.old_votes} old votes`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Does the AI's first idea win?" note="Each meme gets 3 AI captions. Which one did the poster pick?">
          <Bars rows={[1, 2, 3].map((p) => ({ label: `${ORDINAL[p - 1]} option`, value: s.pick_position.find((x) => x.position === p)?.count ?? 0 }))} />
          {totalPicks > 0 && (
            <p className="mt-4 text-sm text-slate-400">
              The first caption gets picked{" "}
              <span className="font-semibold text-white">{pct(s.pick_position.find((x) => x.position === 1)?.count ?? 0, totalPicks)}%</span> of
              the time. Pure chance would be 33%.
            </p>
          )}
        </Card>

        <Card title="Chickened out" note="People who got captions back but never hit Post">
          <div className="flex items-end gap-6">
            <p className="text-5xl font-extrabold tabular-nums text-white">{pct(t.drafts, started)}%</p>
            <p className="pb-1 text-sm text-slate-400">
              {t.drafts} of {started} memes stayed as drafts.
            </p>
          </div>
          <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded">
            <span className="bg-cyan-400" style={{ width: `${pct(t.posts, started)}%` }} title={`Posted: ${t.posts}`} />
            <span className="flex-1 bg-white/15" title={`Drafts: ${t.drafts}`} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Cyan is posted, gray is abandoned. Hover for counts.</p>
        </Card>

        <Card title="Busiest chats" note="Published memes per chat. Hover for likes and members.">
          <ul className="space-y-2">
            {s.topics.map((tp) => {
              const max = Math.max(1, ...s.topics.map((x) => x.posts));
              return (
                <li key={tp.name} className="grid grid-cols-[7.5rem_1fr_5.5rem] items-center gap-3 text-sm" title={`#${tp.name}: ${tp.posts} memes, ${tp.likes} likes, ${tp.members} members`}>
                  <span className="truncate text-slate-300">#{tp.name}</span>
                  <span className="h-3 rounded-r bg-white/5">
                    <span className="block h-3 rounded-r bg-cyan-400" style={{ width: `${Math.max(2, (tp.posts / max) * 100)}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-slate-400">{tp.posts} · {tp.likes}❤</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="When people post" note={busiest && busiest.count > 0 ? `Peak hour is ${hourLabel(busiest.hour)} (New York time)` : "New York time"}>
          <Columns rows={s.hours.map((h) => ({ label: hourLabel(h.hour), value: h.count, tip: `${hourLabel(h.hour)}: ${h.count} memes` }))} />
        </Card>

        <Card title="Short and sweet?" note="Average caption length in characters">
          <Bars
            rows={[
              { label: "Picked", value: s.caption_length.chosen ?? 0 },
              { label: "Passed over", value: s.caption_length.not_chosen ?? 0 },
            ]}
            unit=" ch"
          />
          <p className="mt-4 text-sm text-slate-400">
            {ideaPosts > 0 && (
              <>
                <span className="font-semibold text-white">{pct(s.with_idea.with, ideaPosts)}%</span> of posted memes came with a hint
                for the AI about what the caption should be about.
              </>
            )}
          </p>
        </Card>

        <Card title="Which AI wrote the captions" note="Gemini model behind each caption">
          <Bars rows={s.models.map((m) => ({ label: m.model, value: m.count }))} />
        </Card>
      </div>

      <h2 className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">Caption pipeline</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Generations" value={genRows.length} hint="latest 500" />
        <Stat label="Success rate" value={`${pct(succeeded, genRows.length)}%`} hint={`${genRows.length - succeeded} failed`} />
        <Stat label="Median wait" value={medianSeconds === null ? "—" : `${medianSeconds}s`} hint="from click to captions" />
        <Stat label="Failed model calls" value={failedCalls} hint={`of ${callRows.length} calls`} />
      </div>
      <Card title="Which model wins the race" note="Models are asked at the same time; this counts who answered first" className="mt-4">
        <Bars rows={[...winners.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} />
      </Card>

      <Card title="Hall of fame" note="Most liked memes" className="mt-4">
        {s.top_posts.length === 0 ? (
          <p className="text-sm text-slate-500">No memes yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {s.top_posts.map((p, i) => (
              <figure key={p.id} className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                <div className="relative">
                  <img src={p.image_url} alt="" className="aspect-square w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-sm">{["🥇", "🥈", "🥉"][i]}</span>
                </div>
                <figcaption className="p-3 text-sm">
                  <p className="line-clamp-3 text-slate-200">{p.caption ?? "(no caption)"}</p>
                  <p className="mt-2 text-xs text-slate-500">#{p.topic} · {p.likes} likes · {p.comments} comments</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
