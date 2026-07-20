"use client";

import Link from "next/link";
import { useState } from "react";

import { useReportLevelPhase } from "./level-phase";

type Item = { id: string; label: string; explain: string; correctBucket?: string };
type Bucket = { id: string; label: string };
type Props = { slug: string; kind: "sort_buckets" | "sequence"; scenario: string; items?: Item[]; buckets?: Bucket[]; steps?: Item[] };
type Result = { passed: boolean; percent: number; perItem: { id: string; label: string; correct: boolean; explain: string }[] };

export default function PlayClient({ slug, kind, scenario, items = [], buckets = [], steps = [] }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string>();
  const [order, setOrder] = useState(steps);
  const [result, setResult] = useState<Result>();
  const [xp, setXp] = useState(0);
  const [isReplay, setIsReplay] = useState(false);
  const [busy, setBusy] = useState(false);

  /** A replay must start from a clean board, not the answers that were just scored. */
  function tryAgain() { setResult(undefined); setAnswers({}); setSelected(undefined); setOrder(steps); setXp(0); setIsReplay(false); }

  const touched = Object.keys(answers).length > 0 || order.some((step, index) => step.id !== steps[index]?.id);
  useReportLevelPhase(result ? "results" : touched ? "in_progress" : "fresh");

  async function submit() {
    setBusy(true);
    try {
      const response = await fetch("/api/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, answers, playerOrder: order.map((step) => step.id) }) });
      const data = await response.json();
      if (response.ok) { setResult(data.result); setXp(data.awardedXp ?? 0); setIsReplay(data.isReplay ?? false); }
    } finally { setBusy(false); }
  }

  if (result) return <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl rounded-3xl border border-[#eadbca] bg-white p-6 shadow-xl shadow-[#6c4127]/10 sm:p-9"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a65e2e]">Challenge review</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-[#3b2019]">{result.passed ? "You cracked it!" : "A useful first draft"}</h1><p className="mt-2 text-[#765343]">{result.passed ? "Your choices show the pattern clearly." : "Read the feedback, adjust your thinking, and go again."}</p></div><div className={`rounded-2xl px-5 py-3 text-center ${result.passed ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}><p className="text-2xl font-black">{result.percent}%</p><p className="text-xs font-bold uppercase tracking-wider">score</p></div></div>{xp > 0 ? <p className="mt-5 inline-flex rounded-full bg-[#fde8ad] px-4 py-2 text-sm font-black text-[#75420e]">+{xp} XP earned</p> : isReplay ? <p className="mt-5 inline-flex rounded-full bg-[#f1e7dc] px-4 py-2 text-sm font-black text-[#604536]">↺ Practice replay — no XP this time. You already banked the XP for this level.</p> : null}<div className="mt-7 space-y-3">{result.perItem.map((item) => <article className={`rounded-2xl border p-4 ${item.correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`} key={item.id}><p className="font-bold text-[#3b2019]"><span className="mr-2">{item.correct ? "✓" : "↺"}</span>{item.label}</p><p className="mt-2 text-sm leading-6 text-[#604536]">{item.explain}</p></article>)}</div><div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3b2019] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#5b3024] focus:outline-none focus:ring-2 focus:ring-[#f7c65a] sm:flex-none sm:min-w-44" href="/map">← Back to Home</Link><button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#ddc3aa] bg-white px-5 py-3 text-sm font-black text-[#3b2019] transition hover:-translate-y-0.5 hover:border-[#d9873a] hover:bg-[#fff6e8] focus:outline-none focus:ring-2 focus:ring-[#f7c65a] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 sm:flex-none sm:min-w-44" disabled={busy} onClick={tryAgain}>{busy ? "Loading…" : "Try another round"}</button></div></div></main>;

  const complete = kind === "sort_buckets" ? Object.keys(answers).length === items.length : order.length === steps.length;
  return <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-8"><div className="mx-auto max-w-4xl"><header className="rounded-3xl bg-[#3b2019] p-6 text-white shadow-xl shadow-[#3b2019]/15 sm:p-8"><p className="text-sm font-bold uppercase tracking-[0.18em] text-[#f7c65a]">{kind === "sort_buckets" ? "Sort it out" : "Put it in order"}</p><h1 className="mt-2 text-3xl font-black">{kind === "sort_buckets" ? "Find the right home" : "Build the launch sequence"}</h1><p className="mt-3 max-w-3xl leading-7 text-[#f7e9d5]">{scenario}</p></header><section className="mt-6 rounded-3xl border border-[#eadbca] bg-white p-5 shadow-sm sm:p-7">{kind === "sort_buckets" ? <><p className="font-bold text-[#3b2019]">1. Pick a fact. 2. Place it in the best bucket.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map((item) => <button className={`rounded-2xl border p-4 text-left font-semibold transition ${selected === item.id ? "border-[#d9873a] bg-[#fff0d4] ring-2 ring-[#f7c65a]" : answers[item.id] ? "border-emerald-200 bg-emerald-50" : "border-[#eadbca] hover:border-[#d9873a] hover:bg-[#fffaf4]"}`} key={item.id} onClick={() => setSelected(item.id)}><span className="block text-sm text-[#3b2019]">{item.label}</span>{answers[item.id] ? <span className="mt-2 block text-xs font-bold text-emerald-800">Placed in: {buckets.find((bucket) => bucket.id === answers[item.id])?.label}</span> : null}</button>)}</div><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{buckets.map((bucket) => <button className="rounded-2xl border border-[#d7e7de] bg-[#eff9f4] px-4 py-4 text-left font-bold text-[#245b48] transition hover:-translate-y-0.5 hover:bg-[#dff3e8] disabled:cursor-not-allowed disabled:opacity-50" disabled={!selected} key={bucket.id} onClick={() => selected && setAnswers({ ...answers, [selected]: bucket.id })}>{bucket.label}</button>)}</div></> : <><p className="font-bold text-[#3b2019]">Use the arrows to place each step in the order it should happen.</p><div className="mt-5 space-y-3">{order.map((step, index) => <div className="flex items-center gap-3 rounded-2xl border border-[#eadbca] bg-[#fffaf4] p-3 sm:p-4" key={step.id}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#3b2019] text-sm font-black text-white">{index + 1}</span><span className="min-w-0 flex-1 font-semibold text-[#3b2019]">{step.label}</span><div className="flex gap-2"><button aria-label={`Move ${step.label} up`} className="grid size-9 place-items-center rounded-lg border border-[#ddc3aa] font-bold text-[#3b2019] disabled:opacity-30" disabled={index === 0} onClick={() => { const next = [...order]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setOrder(next); }}>↑</button><button aria-label={`Move ${step.label} down`} className="grid size-9 place-items-center rounded-lg border border-[#ddc3aa] font-bold text-[#3b2019] disabled:opacity-30" disabled={index === order.length - 1} onClick={() => { const next = [...order]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; setOrder(next); }}>↓</button></div></div>)}</div></>}<button className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b2019] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#5b3024] focus:outline-none focus:ring-2 focus:ring-[#f7c65a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:min-w-44" disabled={!complete || busy} onClick={submit}>{busy ? "Checking your work…" : "Check my answer"}</button></section></div></main>;
}
