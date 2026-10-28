"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import GoogleIcon from "@/app/components/GoogleIcon";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl panel-strong p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl btn-neon text-2xl font-black">M</div>
        <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/70">Admins only</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neon">Control Room</h1>
        <p className="mt-2 text-slate-400">Admin area for the Humor Project database. If you&apos;re not an admin, nothing to see here.</p>
        <button
          onClick={signIn}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-md bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
        >
          <GoogleIcon /> {loading ? "Opening Google..." : "Log in with Google"}
        </button>
      </div>
    </main>
  );
}
