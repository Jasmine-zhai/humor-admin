"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase-browser";
import { IMAGE_BUCKET } from "@/lib/config";
import { readValue, type Field } from "@/lib/resources";
import { timeAgo } from "@/app/components/ui";
import { createRow, deleteRow, updateRow } from "./actions";

type Row = Record<string, unknown>;
type Props = {
  slug: string;
  fields: Field[];
  rows: Row[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  upload: boolean;
  idKey: string;
};

export default function ResourceTable({ slug, fields, rows, canCreate, canUpdate, canDelete, upload, idKey }: Props) {
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [confirmId, setConfirmId] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const listFields = fields.filter((f) => !f.hideInList);

  function remove(id: unknown) {
    setError("");
    start(async () => {
      const res = await deleteRow(slug, id as string | number);
      if (res.error) setError(res.error);
      setConfirmId(null);
    });
  }

  return (
    <div className="rounded-xl panel">
      {(canCreate || error) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          {error ? <p className="text-sm text-rose-400">{error}</p> : <span />}
          {canCreate && (
            <button onClick={() => setEditing("new")} className="shrink-0 rounded-md btn-neon px-3 py-1.5 text-sm font-semibold">
              + Add new
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
            <tr className="border-b border-white/10">
              {listFields.map((f) => (
                <th key={f.key} className="px-3 py-2.5 font-semibold">{f.label}</th>
              ))}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = row[idKey];
              return (
                <tr key={String(id)} className="border-b border-white/5 align-top last:border-0 hover:bg-white/5">
                  {listFields.map((f) => (
                    <td key={f.key} className="max-w-xs px-3 py-2.5 text-slate-300">
                      <Cell field={f} value={readValue(row, f.key)} />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs">
                    {confirmId === id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-slate-400">Delete?</span>
                        <button disabled={pending} onClick={() => remove(id)} className="rounded bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-700">Yes</button>
                        <button onClick={() => setConfirmId(null)} className="text-slate-400 hover:underline">No</button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-1">
                        <button onClick={() => setViewing(row)} className="rounded px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white">View</button>
                        {canUpdate && <button onClick={() => setEditing(row)} className="rounded px-2 py-1 text-cyan-300 hover:bg-cyan-400/10">Edit</button>}
                        {canDelete && <button onClick={() => setConfirmId(id)} className="rounded px-2 py-1 text-rose-300 hover:bg-rose-500/10">Delete</button>}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nothing here.</p>}
      </div>

      {viewing && (
        <Modal title="Details" onClose={() => setViewing(null)}>
          <dl className="space-y-3 text-sm">
            {fields.map((f) => (
              <div key={f.key}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">{f.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-slate-200">
                  <Cell field={f} value={readValue(viewing, f.key)} full />
                </dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}

      {editing && (
        <EditForm
          slug={slug}
          fields={fields.filter((f) => f.editable)}
          row={editing === "new" ? null : editing}
          idKey={idKey}
          upload={upload}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Cell({ field, value, full }: { field: Field; value: unknown; full?: boolean }) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-600">—</span>;
  switch (field.type) {
    case "boolean":
      return value ? <span className="text-emerald-400">Yes</span> : <span className="text-slate-500">No</span>;
    case "datetime":
      return <span title={new Date(String(value)).toLocaleString()}>{timeAgo(String(value))}</span>;
    case "image":
      return <img src={String(value)} alt="" className={full ? "max-h-64 rounded-md" : "h-12 w-12 rounded-md object-cover"} />;
    case "json":
      return <code className="text-xs">{JSON.stringify(value)}</code>;
    case "longtext": {
      const text = String(value);
      return full ? <>{text}</> : <span title={text}>{text.length > 140 ? text.slice(0, 140) + "…" : text}</span>;
    }
    default:
      return <>{String(value)}</>;
  }
}

function EditForm({ slug, fields, row, idKey, upload, onClose }: { slug: string; fields: Field[]; row: Row | null; idKey: string; upload: boolean; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, row ? row[f.key] ?? (f.type === "boolean" ? false : "") : f.type === "boolean" ? false : ""]))
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }));

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    const supabase = createClient();
    const path = `admin/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file);
    setUploading(false);
    if (error) {
      setError("Upload failed: " + error.message);
      return;
    }
    set("url", supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
  }

  function save() {
    setError("");
    start(async () => {
      const res = row ? await updateRow(slug, row[idKey] as string | number, values) : await createRow(slug, values);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  const input = "w-full rounded-md bg-black/40 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-400/60";

  return (
    <Modal title={row ? "Edit" : "Add new"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-4"
      >
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-400">
              {f.label} {f.required && <span className="text-rose-400">*</span>}
            </span>
            <div className="mt-1.5">
              {f.type === "boolean" ? (
                <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-cyan-400" />
              ) : f.type === "longtext" ? (
                <textarea rows={4} value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={input} />
              ) : f.type === "image" ? (
                <div className="space-y-2">
                  {values[f.key] ? <img src={String(values[f.key])} alt="" className="max-h-40 rounded-md" /> : null}
                  {upload && (
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} className="block text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white" />
                  )}
                  <input value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder="…or paste an image URL" className={input} />
                </div>
              ) : (
                <input type={f.type === "number" ? "number" : "text"} step="any" value={String(values[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} className={input} />
              )}
            </div>
          </label>
        ))}
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-white/10">Cancel</button>
          <button disabled={pending || uploading} className="rounded-md btn-neon px-4 py-2 text-sm font-semibold disabled:opacity-60">
            {uploading ? "Uploading..." : pending ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl panel-strong p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded px-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
