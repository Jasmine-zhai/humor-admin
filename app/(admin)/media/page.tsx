import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/app/components/ui";
import MediaCard, { type Meme } from "./MediaCard";

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { supabase } = await requireAdmin();
  const { show = "posted" } = await searchParams;
  const { data, error } = await supabase.rpc("admin_media");
  if (error) return <p className="text-rose-400">Couldn&apos;t load memes: {error.message}</p>;

  const all = (data ?? []) as Meme[];
  const posted = all.filter((m) => m.published);
  const drafts = all.filter((m) => !m.published);
  const list = show === "drafts" ? drafts : posted;

  const tab = (key: string, label: string, n: number) => (
    <Link
      href={`/media?show=${key}`}
      className={`rounded-md px-3 py-1.5 text-sm ${show === key ? "bg-cyan-400/15 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
    >
      {label} <span className="text-slate-500">{n}</span>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="AI captions"
        subtitle="Every meme and the captions Gemini wrote for it. Generate more, write your own, edit, pick which one shows in the feed, or delete."
      />
      <div className="mb-4 flex gap-1">
        {tab("posted", "Posted", posted.length)}
        {tab("drafts", "Drafts", drafts.length)}
      </div>
      {list.length === 0 && <p className="text-sm text-slate-500">Nothing here.</p>}
      <div className="space-y-4">
        {list.map((m) => (
          <MediaCard key={m.id} meme={m} />
        ))}
      </div>
    </>
  );
}
