import { NextResponse } from "next/server";
import { generateDebrief } from "../../../lib/ai/client";
import { getProgress, getSupabaseServerClient, recordAttempt, upsertProgress } from "../../../lib/db";
import { getLevelBySlug } from "../../../lib/game/content";
import { hasCompletedLevel, resolveXpAward } from "../../../lib/game/replay";
import { getAnonymousSessionUserId } from "../../../lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await getAnonymousSessionUserId();
    const body = await request.json() as { slug?: string; nodeId?: string; decisionId?: string; action?: string };
    const level = body.slug ? getLevelBySlug(body.slug) : undefined;
    if (!userId || !level || level.gameplay.kind !== "narrative") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const startMetrics = Object.fromEntries(level.gameplay.metrics.map((metric) => [metric.id, metric.start]));

    if (body.action === "restart") {
      const wasCompleted = hasCompletedLevel(await getProgress(userId), level.id);
      await recordAttempt({
        userId,
        levelId: level.id,
        payload: { kind: "narrative_state", currentNodeId: level.gameplay.startNodeId, metrics: startMetrics, completed: false, isReplay: wasCompleted },
      });
      return NextResponse.json({
        state: { currentNodeId: level.gameplay.startNodeId, metrics: startMetrics },
        completed: false,
        isReplay: wasCompleted,
      });
    }

    if (!body.nodeId || !body.decisionId) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    const node = level.gameplay.nodes.find((item) => item.id === body.nodeId);
    const decision = node?.decisions.find((item) => item.id === body.decisionId);
    if (!node || !decision) return NextResponse.json({ error: "Missing decision" }, { status: 400 });

    const { data } = await getSupabaseServerClient()
      .from("attempts")
      .select("payload")
      .eq("user_id", userId)
      .eq("level_id", level.id)
      .contains("payload", { kind: "narrative_state" })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previous = data?.payload as { metrics?: Record<string, number> } | null;
    const before = previous?.metrics ?? startMetrics;
    const metrics = { ...before };
    for (const [id, delta] of Object.entries(decision.metricDeltas)) metrics[id] = (metrics[id] ?? 0) + delta;

    const debrief = await generateDebrief({
      userId, levelId: level.id, levelTopic: level.topic, node, decision,
      metricDefs: level.gameplay.metrics, metricsBefore: before, metricsAfter: metrics,
    });

    const completed = decision.nextNodeId === null;
    const wasCompleted = hasCompletedLevel(await getProgress(userId), level.id);
    const { isReplay, awardedXp } = resolveXpAward(wasCompleted, level.xpReward);

    await recordAttempt({
      userId, levelId: level.id,
      payload: { kind: "narrative_state", currentNodeId: decision.nextNodeId, metrics, completed, isReplay },
      score: debrief,
    });
    // Only the first run-through writes progress — replaying must never overwrite banked XP.
    if (completed && !wasCompleted) {
      await upsertProgress({ userId, levelId: level.id, status: "completed", xpEarned: awardedXp });
    }

    return NextResponse.json({
      debrief,
      state: { currentNodeId: decision.nextNodeId, metrics },
      completed,
      awardedXp: completed ? awardedXp : 0,
      isReplay: completed && isReplay,
    });
  } catch {
    return NextResponse.json({ error: "Could not save that decision." }, { status: 500 });
  }
}
