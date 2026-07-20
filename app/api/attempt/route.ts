import { NextResponse } from "next/server";
import { getProgress, recordAttempt, upsertProgress } from "../../../lib/db";
import { getLevelBySlug } from "../../../lib/game/content";
import { hasCompletedLevel, resolveXpAward } from "../../../lib/game/replay";
import { scoreSequence, scoreSortBuckets } from "../../../lib/game/scoring";
import { getAnonymousSessionUserId } from "../../../lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getAnonymousSessionUserId();
  if (!userId) return NextResponse.json({ error: "No session" }, { status: 401 });

  const body = await request.json() as { slug?: string; answers?: Record<string, string>; playerOrder?: string[] };
  const level = body.slug ? getLevelBySlug(body.slug) : undefined;
  if (!level || (level.gameplay.kind !== "sort_buckets" && level.gameplay.kind !== "sequence")) {
    return NextResponse.json({ error: "Unsupported level" }, { status: 400 });
  }

  const result = level.gameplay.kind === "sort_buckets"
    ? scoreSortBuckets(level.gameplay, body.answers ?? {})
    : scoreSequence(level.gameplay, body.playerOrder ?? []);
  await recordAttempt({ userId, levelId: level.id, payload: body, score: result });

  const wasCompleted = hasCompletedLevel(await getProgress(userId), level.id);
  const { isReplay, awardedXp } = resolveXpAward(wasCompleted, level.xpReward);
  // Only the first pass writes progress — replaying must never overwrite banked XP.
  if (result.passed && !wasCompleted) {
    await upsertProgress({ userId, levelId: level.id, status: "completed", xpEarned: awardedXp });
  }

  return NextResponse.json({ result, awardedXp: result.passed ? awardedXp : 0, isReplay: result.passed && isReplay });
}
