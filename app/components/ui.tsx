// Small shared pieces for the admin pages.

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function Card({ title, note, children, className = "" }: { title?: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl panel p-5 ${className}`}>
      {title && <h2 className="font-semibold text-white">{title}</h2>}
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl panel p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Horizontal bars, one color. Hover a row to see the exact number.
export function Bars({ rows, unit = "" }: { rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="group grid grid-cols-[10rem_1fr_3.5rem] items-center gap-3 text-sm" title={`${r.label}: ${r.value}${unit}`}>
          <span className="truncate text-slate-300">{r.label}</span>
          <span className="h-3 rounded-r bg-white/5">
            <span
              className="block h-3 rounded-r bg-cyan-400 transition group-hover:bg-cyan-300"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right tabular-nums text-slate-400">{r.value}{unit}</span>
        </li>
      ))}
    </ul>
  );
}

// Vertical columns for things in order (hours, days).
export function Columns({ rows }: { rows: { label: string; value: number; tip: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      <div className="flex h-36 items-end gap-[2px]">
        {rows.map((r) => (
          <div key={r.label} className="group relative flex h-full flex-1 items-end" title={r.tip}>
            <div
              className="w-full rounded-t bg-violet-400/80 transition group-hover:bg-violet-300"
              style={{ height: `${r.value === 0 ? 0 : Math.max(4, (r.value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-slate-500">
        {rows.map((r, i) => (
          <span key={r.label} className="flex-1 text-center">{i % Math.ceil(rows.length / 8) === 0 ? r.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
