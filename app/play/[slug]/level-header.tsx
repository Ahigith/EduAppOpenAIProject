"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLevelPhase } from "./level-phase";

type Toast = { tone: "ok" | "warn"; message: string };
type ProgressRow = { levelId: string; status: string; xpEarned: number };

const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b2019] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#5b3024] focus:outline-none focus:ring-2 focus:ring-[#f7c65a] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#ddc3aa] bg-white px-5 py-3 text-sm font-black text-[#3b2019] transition hover:-translate-y-0.5 hover:border-[#d9873a] hover:bg-[#fff6e8] focus:outline-none focus:ring-2 focus:ring-[#f7c65a] disabled:opacity-60";

export default function LevelHeader({ title }: { title: string }) {
  const router = useRouter();
  const phase = useLevelPhase();
  const [toast, setToast] = useState<Toast>();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!confirming) return;
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setConfirming(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  function show(tone: Toast["tone"], message: string) { clearTimeout(timer.current); setToast({ tone, message }); timer.current = setTimeout(() => setToast(undefined), 4000); }

  async function save(): Promise<boolean> {
    const userId = localStorage.getItem("userId");
    if (!userId) { show("warn", "Sign in with your handle to save progress."); return false; }
    try {
      const response = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (!response.ok) { show("warn", response.status === 401 ? "Your session expired — sign in again to save." : "We couldn’t reach the server. Try again in a moment."); return false; }
      const rows = await response.json() as ProgressRow[];
      const xp = rows.reduce((total, row) => total + (row.xpEarned ?? 0), 0);
      show("ok", `Progress saved — ${rows.length} level${rows.length === 1 ? "" : "s"} tracked, ${xp} XP banked.`);
      return true;
    } catch { show("warn", "We couldn’t reach the server. Try again in a moment."); return false; }
  }

  async function onSaveClick() { if (busy) return; setBusy(true); try { await save(); } finally { setBusy(false); } }

  function goHome() { router.push("/map"); }

  function onBackClick() { if (phase === "in_progress") { setConfirming(true); return; } goHome(); }

  async function saveAndGoHome() { if (busy) return; setBusy(true); try { await save(); } finally { setBusy(false); } setConfirming(false); goHome(); }

  return <>
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[#5b3024] bg-[#3b2019]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-8">
        <button className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/30 px-3.5 py-2 text-sm font-bold text-white transition hover:border-white/60 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#f7c65a]" onClick={onBackClick} type="button">← Back to Home</button>
        <p className="hidden min-w-0 flex-1 truncate text-center text-sm font-bold text-[#f7e9d5] sm:block">{title}</p>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#f7c65a] px-3.5 py-2 text-sm font-black text-[#3b2019] transition hover:-translate-y-0.5 hover:bg-[#ffd67f] focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0" disabled={busy} onClick={onSaveClick} type="button">{busy ? "Saving…" : "Save Progress"}</button>
      </div>
    </header>
    <div aria-hidden className="h-16" />

    {confirming ? <div className="fixed inset-0 z-50 grid place-items-center bg-[#3b2019]/60 px-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setConfirming(false); }}>
      <div aria-labelledby="leave-title" aria-modal="true" className="w-full max-w-md rounded-3xl border border-[#eadbca] bg-white p-6 shadow-2xl sm:p-8" role="dialog">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a65e2e]">Leaving this level</p>
        <h2 className="mt-2 text-2xl font-black text-[#3b2019]" id="leave-title">Do you want to save progress before leaving?</h2>
        <p className="mt-3 text-sm leading-6 text-[#765343]">Your completed challenges and XP are already stored. Anything you have typed on this level is not part of an attempt yet.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button autoFocus className={`${primaryButton} w-full sm:flex-1`} disabled={busy} onClick={saveAndGoHome} type="button">{busy ? "Saving…" : "Save & Go Home"}</button>
          <button className={`${secondaryButton} w-full sm:flex-1`} disabled={busy} onClick={goHome} type="button">Go Home</button>
        </div>
        <button className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-bold text-[#876554] transition hover:bg-[#fff6e8] hover:text-[#3b2019] focus:outline-none focus:ring-2 focus:ring-[#f7c65a]" disabled={busy} onClick={() => setConfirming(false)} type="button">Cancel — stay on this level</button>
      </div>
    </div> : null}

    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">{toast ? <p className={`max-w-md rounded-2xl px-5 py-3 text-center text-sm font-bold shadow-xl ${toast.tone === "ok" ? "bg-emerald-600 text-white" : "bg-amber-500 text-[#3b2019]"}`}>{toast.message}</p> : null}</div>
  </>;
}
