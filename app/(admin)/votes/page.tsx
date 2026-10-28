/* eslint-disable @next/next/no-img-element */
import { requireAdmin } from "@/lib/admin";
import { Bars, Card, PageHeader, Stat, timeAgo } from "@/app/components/ui";

type Like = { created_at: string; post_id: number; image_url: string; topic: string | null; voter: string; voter_email: string | null; caption: string | null };
type OldVote = { created_at: string; vote_value: number; caption: string | null; voter: string; voter_email: string | null };

export default async function VotesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_likes");
  if (error) return <p className="text-rose-400">Couldn&apos;t load likes: {error.message}</p>;
  const likes = (data?.likes ?? []) as Like[];
  const oldVotes = (data?.old_votes ?? []) as OldVote[];

  const up = oldVotes.filter((v) => v.vote_value > 0).length;
  const down = oldVotes.filter((v) => v.vote_value < 0).length;

  // who hands out the most likes
  const byVoter = new Map<string, number>();
  for (const l of likes) byVoter.set(l.voter, (byVoter.get(l.voter) ?? 0) + 1);
  const generous = [...byVoter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageHeader title="Likes & votes" subtitle="Likes on memes (the current way to vote), plus the up and down votes from the Week 4 version of the app." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Likes" value={likes.length} />
        <Stat label="Old upvotes" value={up} />
        <Stat label="Old downvotes" value={down} />
        <Stat label="Old vote score" value={up - down} hint="upvotes minus downvotes" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title="Every like" note="Newest first">
          {likes.length === 0 ? (
            <p className="text-sm text-slate-500">No likes yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {likes.map((l, i) => (
                <li key={`${l.post_id}-${l.voter_email}-${i}`} className="flex items-center gap-3 py-2.5 text-sm">
                  <img src={l.image_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-200">
                      <span className="font-semibold text-white">{l.voter}</span> liked <span className="text-slate-400">&quot;{l.caption ?? "a meme"}&quot;</span>
                    </p>
                    <p className="text-xs text-slate-500">#{l.topic} · {l.voter_email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Most generous" note="Who gives out the most likes">
          <Bars rows={generous} />
        </Card>
      </div>

      <Card title="Old up/down votes (Week 4)" note="Read only. Voting moved to likes in Week 5." className="mt-4">
        {oldVotes.length === 0 ? (
          <p className="text-sm text-slate-500">No old votes.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {oldVotes.map((v, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <span className={`w-6 shrink-0 text-center text-lg ${v.vote_value > 0 ? "text-emerald-400" : "text-rose-400"}`}>{v.vote_value > 0 ? "▲" : "▼"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-200">&quot;{v.caption ?? "deleted caption"}&quot;</p>
                  <p className="text-xs text-slate-500">{v.voter} · {v.voter_email}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{timeAgo(v.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
