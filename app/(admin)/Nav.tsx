"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RESOURCES } from "@/lib/resources";

const groups = [...new Set(RESOURCES.map((r) => r.group))];

export default function Nav() {
  const pathname = usePathname();
  const item = (href: string, label: string) => {
    const active = href === "/" ? pathname === "/" : pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`block shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
          active
            ? "bg-gradient-to-r from-cyan-400/15 to-violet-500/10 text-white shadow-[inset_2px_0_0_#22d3ee]"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
        }`}
      >
        {label}
      </Link>
    );
  };
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:flex-1 md:overflow-y-auto">
      {item("/", "📊 Overview")}
      {groups.map((g) => (
        <div key={g} className="flex gap-1 md:mt-4 md:block">
          <p className="hidden px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60 md:block">{g}</p>
          {RESOURCES.filter((r) => r.group === g).map((r) => item(`/${r.slug}`, r.title))}
        </div>
      ))}
      <form action="/auth/signout" method="post" className="md:hidden">
        <button className="shrink-0 rounded-md px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5">Sign out</button>
      </form>
    </nav>
  );
}
