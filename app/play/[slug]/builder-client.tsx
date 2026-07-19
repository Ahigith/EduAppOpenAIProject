"use client";

import { FormEvent, useState } from "react";
import EvaluationResults, { type Criterion, type Evaluation } from "./evaluation-results";

type Field = { id: string; label: string; prompt: string; placeholder?: string; maxChars: number };
type BuilderResponse = { evaluation?: Evaluation | "pending"; awardedXp?: number };

export default function BuilderClient({ slug, title, instructions, fields, rubric }: { slug: string; title: string; instructions: string; fields: Field[]; rubric: Criterion[] }) {
  const emptySubmission = () => Object.fromEntries(fields.map((field) => [field.id, ""]));
  const [submission, setSubmission] = useState<Record<string, string>>(emptySubmission);
  const [evaluation, setEvaluation] = useState<Evaluation | "pending">(); const [awardedXp, setAwardedXp] = useState(0); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (busy || fields.some((field) => !submission[field.id]?.trim() || submission[field.id].length > field.maxChars)) return; setError(""); setBusy(true); try { const response = await fetch("/api/builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, submission }) }); if (!response.ok) { setError("We couldn’t evaluate your model just now. Please try again."); return; } const data = await response.json() as BuilderResponse; if (!data.evaluation) { setError("We couldn’t evaluate your model just now. Please try again."); return; } setEvaluation(data.evaluation); setAwardedXp(data.awardedXp ?? 0); } catch { setError("We couldn’t evaluate your model just now. Please try again."); } finally { setBusy(false); } }
  function tryAgain() { setSubmission(emptySubmission()); setEvaluation(undefined); setAwardedXp(0); setError(""); }
  if (evaluation) return <EvaluationResults evaluation={evaluation} rubric={rubric} awardedXp={awardedXp} onTryAgain={tryAgain} busy={busy} error={error} successTitle="Model complete!" pendingTitle="Thanks for building your model!" />;
  return <main className="min-h-screen p-6"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3 max-w-2xl">{instructions}</p><form className="mt-6 max-w-2xl space-y-6" onSubmit={submit}>{fields.map((field) => <section key={field.id}><label className="block font-semibold" htmlFor={field.id}>{field.label}</label><p className="mt-1 text-sm">{field.prompt}</p><textarea className="mt-2 w-full border p-3" id={field.id} rows={6} value={submission[field.id] ?? ""} maxLength={field.maxChars} placeholder={field.placeholder} disabled={busy} onChange={(event) => setSubmission((current) => ({ ...current, [field.id]: event.target.value }))} /><p className="mt-1 text-right text-sm" aria-live="polite">{(submission[field.id] ?? "").length}/{field.maxChars} characters</p></section>)}{error && <p className="text-red-700" role="alert">{error}</p>}<button className="border bg-black px-4 py-2 text-white" disabled={busy || fields.some((field) => !submission[field.id]?.trim() || submission[field.id].length > field.maxChars)} type="submit">{busy ? "Evaluating…" : "Submit model"}</button></form></main>;
}
