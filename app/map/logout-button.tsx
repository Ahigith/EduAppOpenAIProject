"use client";
import { useRouter } from "next/navigation";
export function LogoutButton() { const router = useRouter(); async function logout() { await fetch("/api/auth/logout", { method: "POST" }); localStorage.removeItem("handle"); localStorage.removeItem("userId"); router.replace("/login"); router.refresh(); } return <button type="button" onClick={logout} className="rounded-xl border border-white/30 px-3 py-2 text-sm font-bold text-white hover:bg-white/10">Log out</button>; }
