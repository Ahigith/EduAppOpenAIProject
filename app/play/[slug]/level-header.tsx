"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Toast = { tone: "ok" | "warn"; message: string };
type ProgressRow = { levelId: string; status: string; xpEarned: number };

export default function LevelHeader({ title }: { title: string }) {
  const [toast, setToast] = useState<Toast>();
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function show(tone: Toast["tone"], message: string) { clearTimeout(timer.current); setToast({ tone, message }); timer.current = setTimeout(() => setToast(undefined), 4000); }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) { show("warn", "Sign in with your handle to save progress."); return; }
      const response = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (!response.ok) { show("warn", response.status === 401 ? "Your session expired — sign in again to save." : "We couldn’t reach the server. Try again in a moment."); return; }
      const rows = await response.json() as ProgressRow[];
      const xp = rows.reduce((total, row) => total + (row.xpEarned ?? 0), 0);
      show("ok", `Progress saved — ${rows.length} level${rows.length === 1 ? "" : "s"} tracked, ${xp} XP banked.`);
    } catch { show("warn", "We couldn’t reach the server. Try again in a moment."); } finally { setBusy(false); }
  }

  return <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#5b3024] bg-[#3b2019]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/30 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10" href="/map">← Back to Home</Link>
        <p className="hidden min-w-0 flex-1 truncate text-center text-sm font-bold text-[#f7e9d5] sm:block">{title}</p>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#f7c65a] px-3 py-2 text-sm font-black text-[#3b2019] transition hover:bg-[#ffd67f] disabled:cursor-wait disabled:opacity-60" disabled={busy} onClick={save} type="button">{busy ? "Saving…" : "Save Progress"}</button>
      </div>
    </header>
    <div aria-hidden className="h-16" />
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">{toast ? <p className={`max-w-md rounded-2xl px-5 py-3 text-center text-sm font-bold shadow-xl ${toast.tone === "ok" ? "bg-emerald-600 text-white" : "bg-amber-500 text-[#3b2019]"}`}>{toast.message}</p> : null}</div>
  </>;
}
