"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview", emoji: "📊" },
  { href: "/users", label: "Users", emoji: "👥" },
  { href: "/media", label: "AI captions", emoji: "🤖" },
  { href: "/votes", label: "Likes & votes", emoji: "❤️" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
              active
                ? "bg-gradient-to-r from-cyan-400/15 to-violet-500/10 text-white shadow-[inset_2px_0_0_#22d3ee]"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            <span aria-hidden>{l.emoji}</span> {l.label}
          </Link>
        );
      })}
      <form action="/auth/signout" method="post" className="md:hidden">
        <button className="shrink-0 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-white/5">Sign out</button>
      </form>
    </nav>
  );
}
