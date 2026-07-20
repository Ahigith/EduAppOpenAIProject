"use client";

import Link from "next/link";

export type Criterion = { id: string; label: string; maxPoints: number };
export type Evaluation = { criteria: { id: string; points: number; passed: boolean; feedback: string }[]; overallPassed: boolean; strengths: string[]; improvements: string[]; encouragement: string };

type Props = { evaluation: Evaluation | "pending"; rubric: Criterion[]; awardedXp: number; onTryAgain: () => void; busy: boolean; error: string; nextSlug?: string; successTitle?: string; pendingTitle?: string };

const actionBase = "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#f7c65a] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 sm:flex-none sm:min-w-44";
const solidAction = `${actionBase} bg-[#3b2019] text-white hover:-translate-y-0.5 hover:bg-[#5b3024]`;
const outlineAction = `${actionBase} border border-[#ddc3aa] bg-white text-[#3b2019] hover:-translate-y-0.5 hover:border-[#d9873a] hover:bg-[#fff6e8]`;

/** Pass = green and celebratory, fail = warm amber and encouraging (never red), pending = neutral slate. */
const tones = {
  passed: { banner: "bg-[#245b48] shadow-emerald-950/15", eyebrow: "text-[#a7e8cd]", label: "Challenge passed", icon: "✦" },
  practise: { banner: "bg-[#8a4b1d] shadow-[#8a4b1d]/20", eyebrow: "text-[#ffd8a8]", label: "Good attempt — keep going", icon: "↺" },
  pending: { banner: "bg-[#4a4340] shadow-black/15", eyebrow: "text-[#dcd5d0]", label: "Feedback still coming", icon: "⌛" },
} as const;

export default function EvaluationResults({ evaluation, rubric, awardedXp, onTryAgain, busy, error, nextSlug, successTitle = "Well done!", pendingTitle = "Thanks for the pitch!" }: Props) {
  const actions = <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <Link className={solidAction} href="/map">← Back to Home</Link>
    {nextSlug ? <Link className={outlineAction} href={`/play/${nextSlug}`}>Next Challenge →</Link> : null}
    <button className={outlineAction} disabled={busy} onClick={onTryAgain} type="button">{busy ? "Starting…" : "Try again"}</button>
  </div>;

  if (evaluation === "pending") {
    const tone = tones.pending;
    return <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><header className={`rounded-3xl p-7 text-white shadow-xl sm:p-9 ${tone.banner}`}><p className={`text-sm font-bold uppercase tracking-[0.18em] ${tone.eyebrow}`}>{tone.label}</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><span aria-hidden>{tone.icon}</span>{pendingTitle}</h1><p className="mt-3 max-w-xl leading-7 text-white/85">Your feedback is taking a little longer than usual. Your work is saved, and you can practise again for free.</p></header>{error ? <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-800" role="alert">{error}</p> : null}{actions}</div></main>;
  }

  const tone = evaluation.overallPassed ? tones.passed : tones.practise;
  return <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><header className={`rounded-3xl p-7 text-white shadow-xl sm:p-9 ${tone.banner}`}><p className={`text-sm font-bold uppercase tracking-[0.18em] ${tone.eyebrow}`}>{tone.label}</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-black"><span aria-hidden>{tone.icon}</span>{evaluation.overallPassed ? successTitle : "Keep practising"}</h1><p className="mt-3 max-w-xl leading-7 text-white/85">{evaluation.overallPassed ? awardedXp > 0 ? `You earned ${awardedXp} XP for completing this challenge.` : "Completed — this was a practice replay, so no extra XP this time." : "You are building the right instincts. Use the feedback below for your next round."}</p></header><section className="mt-6 rounded-3xl border border-[#eadbca] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black text-[#3b2019]">Your scorecard</h2><div className="mt-5 space-y-3">{evaluation.criteria.map((criterion) => { const definition = rubric.find((item) => item.id === criterion.id); return <article className={`rounded-2xl border p-4 ${criterion.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`} key={criterion.id}><div className="flex items-center justify-between gap-3"><h3 className="font-black text-[#3b2019]">{criterion.passed ? "✓" : "↺"} {definition?.label ?? criterion.id}</h3><span className="rounded-full bg-white/70 px-3 py-1 text-sm font-black text-[#3b2019]">{criterion.points}/{definition?.maxPoints ?? "–"}</span></div><p className="mt-2 text-sm leading-6 text-[#604536]">{criterion.feedback}</p></article>; })}</div></section><div className="mt-6 grid gap-5 md:grid-cols-2"><section className="rounded-3xl border border-[#b9ded1] bg-[#f0fbf6] p-5"><h2 className="font-black text-[#245b48]">What worked</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-[#245b48]">{evaluation.strengths.length ? evaluation.strengths.map((item) => <li className="flex gap-2" key={item}><span>✦</span><span>{item}</span></li>) : <li>Keep practising to uncover your strengths.</li>}</ul></section><section className="rounded-3xl border border-[#f0d394] bg-[#fff6df] p-5"><h2 className="font-black text-[#75420e]">Your next move</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-[#75420e]">{evaluation.improvements.length ? evaluation.improvements.map((item) => <li className="flex gap-2" key={item}><span>→</span><span>{item}</span></li>) : <li>Keep refining your founder story.</li>}</ul></section></div><p className="mt-5 rounded-2xl bg-[#fffaf4] p-4 text-center font-medium text-[#604536]">{evaluation.encouragement}</p>{error ? <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-800" role="alert">{error}</p> : null}{actions}</div></main>;
}
