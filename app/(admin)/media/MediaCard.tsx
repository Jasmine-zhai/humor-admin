"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { chooseCaption, createCaption, deleteCaption, deletePost, generateCaptions, updateCaption } from "./actions";
import { timeAgo } from "@/app/components/ui";

export type Caption = { id: number; content: string; chosen: boolean; model: string | null; created_at: string };
export type Meme = {
  id: number; image_url: string; published: boolean; idea: string | null; created_at: string;
  topic: string | null; author: string; likes: number; captions: Caption[];
};

export default function MediaCard({ meme }: { meme: Meme }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function act(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError("");
    start(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else after?.();
    });
  }

  return (
    <article className="grid gap-4 rounded-xl panel p-4 transition hover:border-cyan-400/25 sm:grid-cols-[180px_1fr]">
      <img src={meme.image_url} alt="" className="aspect-square w-full rounded-lg bg-black/40 object-cover" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold text-slate-300">#{meme.topic ?? "?"}</span>
          <span>by {meme.author}</span>
          <span>· {timeAgo(meme.created_at)}</span>
          <span>· {meme.likes} likes</span>
          {!meme.published && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-semibold text-amber-300">Draft</span>}
          <span className="ml-auto">
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <span className="text-slate-400">Delete this meme for good?</span>
                <button onClick={() => act(() => deletePost(meme.id))} disabled={pending} className="rounded bg-rose-600 px-2 py-0.5 font-medium text-white hover:bg-rose-700">
                  Delete
                </button>
                <button onClick={() => setConfirmDelete(false)} className="hover:underline">Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="rounded px-2 py-0.5 text-rose-300 hover:bg-rose-500/10">
                Delete meme
              </button>
            )}
          </span>
        </div>
        {meme.idea && <p className="mt-1 text-xs text-slate-500">Hint for the AI: &quot;{meme.idea}&quot;</p>}

        <ul className="mt-3 space-y-2">
          {meme.captions.map((c) => (
            <CaptionRow key={c.id} caption={c} pending={pending} act={act} />
          ))}
          {meme.captions.length === 0 && <li className="text-sm text-slate-500">No captions.</li>}
        </ul>

        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) act(() => createCaption(meme.id, draft), () => setDraft(""));
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            placeholder="Write a caption by hand..."
            className="min-w-0 flex-1 rounded-md bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400/60"
          />
          <button disabled={pending || !draft.trim()} className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50">
            Add
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => act(() => generateCaptions(meme.id, meme.image_url, meme.topic ?? "General"))}
            className="rounded-md btn-neon px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? "Working..." : "Generate 3 with AI"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      </div>
    </article>
  );
}

function CaptionRow({
  caption: c,
  pending,
  act,
}: {
  caption: Caption;
  pending: boolean;
  act: (fn: () => Promise<{ error?: string }>, after?: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.content);

  return (
    <li className={`rounded-lg border p-2.5 text-sm ${c.chosen ? "border-cyan-400/40 bg-cyan-400/5" : "border-white/10 bg-black/20"}`}>
      {editing ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            className="min-w-0 flex-1 rounded-md bg-black/40 px-2.5 py-1.5 text-slate-200 outline-none focus:ring-2 focus:ring-cyan-400/60"
            autoFocus
          />
          <div className="flex gap-2">
            <button disabled={pending || !text.trim()} onClick={() => act(() => updateCaption(c.id, text), () => setEditing(false))} className="rounded-md btn-neon px-3 py-1.5 font-semibold disabled:opacity-50">
              Save
            </button>
            <button onClick={() => { setEditing(false); setText(c.content); }} className="px-2 text-slate-400 hover:underline">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-200">{c.content}</p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {c.chosen ? <span className="font-semibold text-cyan-300">✓ Shown in feed</span> : (
          <button disabled={pending} onClick={() => act(() => chooseCaption(c.id))} className="hover:text-cyan-300">Show this one in feed</button>
        )}
        <span>{c.model ?? "unknown model"}</span>
        {!editing && <button onClick={() => setEditing(true)} className="hover:text-white">Edit</button>}
        <button disabled={pending} onClick={() => act(() => deleteCaption(c.id))} className="hover:text-rose-300">Delete</button>
      </div>
    </li>
  );
}
