import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getProgress } from "../lib/db";
import { loadAllLevels } from "../lib/game/content";
import { getAuthenticatedSessionUserId, HANDLE_COOKIE } from "../lib/session";
import { LogoutButton } from "./map/logout-button";

export const dynamic = "force-dynamic";

const topicStyles: Record<string, { icon: string; color: string }> = {
  business_model: { icon: "⚙", color: "bg-sky-100 text-sky-900" },
  finance: { icon: "₹", color: "bg-amber-100 text-amber-900" },
  industry: { icon: "◈", color: "bg-violet-100 text-violet-900" },
  pitching: { icon: "✦", color: "bg-rose-100 text-rose-900" },
  product_pipeline: { icon: "→", color: "bg-emerald-100 text-emerald-900" },
};

function titleForTopic(topic: string): string {
  return topic.replaceAll("_", " ");
}

export default async function Home() {
  const userId = await getAuthenticatedSessionUserId();
  if (!userId) redirect("/login");

  const handle = (await cookies()).get(HANDLE_COOKIE)?.value ?? "founder";
  const levels = loadAllLevels();
  const progress = await getProgress(userId);
  const completedLevelIds = new Set(progress.filter((item) => item.status === "completed").map((item) => item.level_id));
  const xp = progress.reduce((sum, item) => sum + item.xp_earned, 0);
  const completedCount = completedLevelIds.size;
  const badgeCount = levels.filter((level) => level.badgeId && completedLevelIds.has(level.id)).length;
  const badgeTotal = levels.filter((level) => level.badgeId).length;
  const topics = [...new Set(levels.map((level) => level.topic))];

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] border border-white/80 bg-[#3b2019] text-[#fff8ed] shadow-xl shadow-[#3b2019]/15">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 px-6 py-4 sm:px-9">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#f7c65a] text-xl font-black text-[#3b2019]">✦</span>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#f7c65a]">Young Entrepreneurs</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-[#f7e9d5]">Playing as: <span className="font-black text-white">{handle}</span></p>
              <LogoutButton />
            </div>
          </div>
          <div className="flex flex-col gap-6 px-6 py-7 sm:px-9 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your founder journey</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#f7e9d5] sm:text-base">Learn by deciding, building, pitching, and trying again — one ChocoNation challenge at a time.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7c65a] px-5 py-4 text-center text-[#3b2019] shadow-lg shadow-black/10">
                <p className="text-xs font-black uppercase tracking-wider">XP earned</p>
                <p className="mt-1 text-4xl font-black leading-none">{xp}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wider text-[#f7e9d5]">Levels done</p>
                <p className="mt-1 text-2xl font-black">{completedCount}/{levels.length}</p>
              </div>
              {badgeTotal > 0 ? (
                <div className="col-span-2 rounded-2xl bg-white/10 px-5 py-4 text-center backdrop-blur sm:col-span-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#f7e9d5]">Badges</p>
                  <p className="mt-1 text-2xl font-black">{badgeCount}/{badgeTotal}</p>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="map-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a65e2e]">Topic grid</p>
              <h2 id="map-heading" className="mt-1 text-2xl font-black tracking-tight text-[#3b2019]">Choose your next challenge</h2>
            </div>
            <p className="text-sm text-[#765343]">Tier 1 is open to explore. Finish it to unlock Tier 2.</p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => {
              const topicLevels = levels.filter((level) => level.topic === topic);
              const tierOneDone = topicLevels.some((level) => level.tier === 1 && completedLevelIds.has(level.id));
              const style = topicStyles[topic] ?? { icon: "●", color: "bg-stone-100 text-stone-900" };

              return (
                <section key={topic} className="overflow-hidden rounded-3xl border border-[#eadbca] bg-white/90 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#f1e7dc] px-5 py-4">
                    <span className={`grid size-10 place-items-center rounded-2xl text-xl font-black ${style.color}`}>{style.icon}</span>
                    <div>
                      <h3 className="text-lg font-black capitalize text-[#3b2019]">{titleForTopic(topic)}</h3>
                      <p className="text-xs font-medium text-[#876554]">{topicLevels.filter((level) => completedLevelIds.has(level.id)).length} of {topicLevels.length} complete</p>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    {topicLevels.map((level) => {
                      const completed = completedLevelIds.has(level.id);
                      const unlocked = level.tier === 1 || tierOneDone;
                      return (
                        <div key={level.id} className={`rounded-2xl border p-4 transition ${completed ? "border-emerald-200 bg-emerald-50" : unlocked ? "border-[#ebd6bc] bg-[#fffaf4]" : "border-stone-200 bg-stone-50 opacity-70"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-[#a65e2e]">Tier {level.tier}</p>
                              <h4 className="mt-1 font-bold leading-5 text-[#3b2019]">{level.title}</h4>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${completed ? "bg-emerald-200 text-emerald-900" : unlocked ? "bg-[#fde8ad] text-[#75420e]" : "bg-stone-200 text-stone-600"}`}>{completed ? "Complete" : unlocked ? "Ready" : "Locked"}</span>
                          </div>
                          {completed && level.badgeId ? <p className="mt-3 text-xs font-bold text-emerald-800">✦ Badge earned: {level.badgeId.replace("badge_", "").replaceAll("_", " ")}</p> : null}
                          {unlocked ? <Link className="mt-4 inline-flex items-center rounded-xl bg-[#3b2019] px-3.5 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#5b3024] focus:outline-none focus:ring-2 focus:ring-[#f7c65a]" href={`/play/${level.slug}`}>{completed ? "Practise again" : "Start challenge"} <span className="ml-2">→</span></Link> : <p className="mt-4 text-xs font-medium text-stone-500">Complete Tier 1 to open this challenge.</p>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
