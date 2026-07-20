"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle }) });
      const result = await response.json() as { userId?: string; error?: string };
      if (!response.ok || !result.userId) { setError(result.error ?? "Could not sign in."); return; }
      localStorage.setItem("handle", handle.trim()); localStorage.setItem("userId", result.userId);
      router.replace("/map"); router.refresh();
    } catch { setError("Could not sign in. Please check your connection and try again."); } finally { setSubmitting(false); }
  }
  return <main className="grid min-h-screen place-items-center px-5 py-10"><form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-[#eadbca] bg-white p-7 shadow-xl shadow-[#3b2019]/10 sm:p-9"><p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a65e2e]">Young Entrepreneurs</p><h1 className="mt-3 text-3xl font-black tracking-tight text-[#3b2019]">Choose your handle</h1><p className="mt-3 text-sm leading-6 text-[#765343]">No password needed. Use the same handle later to continue your founder journey.</p><label className="mt-7 block text-sm font-bold text-[#3b2019]" htmlFor="handle">Handle</label><input id="handle" value={handle} onChange={(event) => setHandle(event.target.value)} autoComplete="username" required minLength={2} maxLength={32} className="mt-2 w-full rounded-xl border border-[#d9bfa9] px-4 py-3 text-[#3b2019] outline-none focus:border-[#a65e2e] focus:ring-2 focus:ring-[#f7c65a]" placeholder="e.g. judge1" />{error ? <p className="mt-3 text-sm font-medium text-red-700" role="alert">{error}</p> : null}<button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-[#3b2019] px-4 py-3 font-bold text-white disabled:opacity-60">{submitting ? "Signing in…" : "Start learning"}</button></form></main>;
}
