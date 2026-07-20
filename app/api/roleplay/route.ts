import { NextResponse } from "next/server";

import { evaluateAttempt } from "../../../lib/ai/client";
import { generateRoleplayAttemptTurn } from "../../../lib/ai/roleplay-flow";
import { appendTranscript, getProgress, getSupabaseServerClient, recordAttempt, upsertProgress } from "../../../lib/db";
import { getLevelBySlug } from "../../../lib/game/content";
import { hasCompletedLevel } from "../../../lib/game/replay";
import { roleplayRestartState, roleplayXpAward } from "../../../lib/game/roleplay-restart";
import { getAnonymousSessionUserId } from "../../../lib/session";
import type { EvalResult } from "../../../lib/schemas";

export const runtime = "nodejs";

type TranscriptRow = { role: "player" | "persona"; content: string };
type InternalNote = { turnNumber: number; content: string };
type RoleplayPayload = { kind: "roleplay"; completed?: boolean; internalNotes?: InternalNote[]; isReplay?: boolean };

function readRoleplayPayload(value: unknown): RoleplayPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  return payload.kind === "roleplay" ? payload as RoleplayPayload : null;
}

function transcriptWithNotes(transcript: TranscriptRow[], internalNotes: InternalNote[]) {
  let personaIndex = 0;
  return transcript.map((turn) => {
    if (turn.role === "player") return turn;
    const internalNote = internalNotes[personaIndex++]?.content;
    return internalNote ? { ...turn, internalNote } : turn;
  });
}

export async function POST(request: Request) {
  try {
    const userId = await getAnonymousSessionUserId();
    if (!userId) return NextResponse.json({ error: "No session" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid roleplay request" }, { status: 400 });
    }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid roleplay request" }, { status: 400 });
    const { slug, message, action } = body as { slug?: unknown; message?: unknown; action?: unknown };
    if (typeof slug !== "string") return NextResponse.json({ error: "A roleplay level is required" }, { status: 400 });

    const level = getLevelBySlug(slug);
    if (!level || level.gameplay.kind !== "roleplay") {
      return NextResponse.json({ error: "This is not a roleplay level" }, { status: 400 });
    }

    if (action === "restart") {
      const supabase = getSupabaseServerClient();
      const { data: currentAttempt, error: currentAttemptError } = await supabase
        .from("attempts")
        .select("id, payload")
        .eq("user_id", userId)
        .eq("level_id", level.id)
        .contains("payload", { kind: "roleplay" })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (currentAttemptError) throw currentAttemptError;

      const currentPayload = readRoleplayPayload(currentAttempt?.payload);
      if (currentAttempt && !currentPayload?.completed) {
        const { error: closeAttemptError } = await supabase
          .from("attempts")
          .update({ payload: { kind: "roleplay", internalNotes: currentPayload?.internalNotes ?? [], completed: true } })
          .eq("id", currentAttempt.id);
        if (closeAttemptError) throw closeAttemptError;
      }
      const wasCompleted = hasCompletedLevel(await getProgress(userId), level.id);
      await recordAttempt({ userId, levelId: level.id, payload: { kind: "roleplay", internalNotes: [], isReplay: wasCompleted } });
      return NextResponse.json({ ...roleplayRestartState(level.gameplay.persona.maxTurns), isReplay: wasCompleted });
    }
    if (action !== undefined) return NextResponse.json({ error: "Invalid roleplay action" }, { status: 400 });
    if (typeof message !== "string" || !message.trim() || message.length > 800) {
      return NextResponse.json({ error: "A non-empty message of 800 characters or fewer is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existingAttempt, error: existingAttemptError } = await supabase
      .from("attempts")
      .select("id, payload")
      .eq("user_id", userId)
      .eq("level_id", level.id)
      .contains("payload", { kind: "roleplay" })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingAttemptError) throw existingAttemptError;

    // A message arriving after the last attempt closed (e.g. the player reloaded the results
    // page and started typing) opens a fresh attempt instead of dead-ending on an error.
    const lastPayload = readRoleplayPayload(existingAttempt?.payload);
    const isFinishedAttempt = !existingAttempt || Boolean(lastPayload?.completed);
    const existingPayload = isFinishedAttempt ? null : lastPayload;

    const attempt = isFinishedAttempt
      ? await recordAttempt({
          userId,
          levelId: level.id,
          payload: { kind: "roleplay", internalNotes: [], isReplay: hasCompletedLevel(await getProgress(userId), level.id) },
        })
      : existingAttempt!;
    await appendTranscript({ attemptId: attempt.id, role: "player", content: message.trim() });

    const { data: transcriptRows, error: transcriptError } = await supabase
      .from("transcripts")
      .select("role, content")
      .eq("attempt_id", attempt.id)
      .order("created_at", { ascending: true });
    if (transcriptError) throw transcriptError;
    const transcript = (transcriptRows ?? []) as TranscriptRow[];
    const turnNumber = transcript.filter((turn) => turn.role === "player").length;

    const { personaTurn, shouldEvaluate } = await generateRoleplayAttemptTurn({
      persona: level.gameplay.persona,
      turnNumber,
      transcript,
    });
    await appendTranscript({ attemptId: attempt.id, role: "persona", content: personaTurn.message });

    const internalNotes = [...(existingPayload?.internalNotes ?? []), { turnNumber, content: personaTurn.internalNote }];
    const attemptIsReplay = readRoleplayPayload(attempt.payload)?.isReplay ?? false;
    const completedPayload: RoleplayPayload = { kind: "roleplay", internalNotes, completed: shouldEvaluate, isReplay: attemptIsReplay };
    let evaluation: EvalResult | "pending" | undefined;
    let awardedXp = 0;
    let isReplay = false;

    if (shouldEvaluate) {
      evaluation = await evaluateAttempt(level.gameplay.rubric, level.gameplay.passCriteriaCount, "roleplay", {
        levelTitle: level.title,
        transcript: transcriptWithNotes([...transcript, { role: "persona", content: personaTurn.message }], internalNotes),
      });
      if (evaluation !== "pending" && evaluation.overallPassed) {
        const wasCompleted = hasCompletedLevel(await getProgress(userId), level.id);
        awardedXp = roleplayXpAward(wasCompleted, level.xpReward);
        isReplay = wasCompleted;
        // Only the first pass writes progress — replaying must never overwrite banked XP.
        if (!wasCompleted) {
          await upsertProgress({ userId, levelId: level.id, status: "completed", xpEarned: awardedXp });
        }
      }
    }

    const { error: updateError } = await supabase
      .from("attempts")
      .update({ payload: completedPayload, score: evaluation ?? null })
      .eq("id", attempt.id);
    if (updateError) throw updateError;

    return NextResponse.json({
      personaTurn: { message: personaTurn.message, isClosing: personaTurn.isClosing },
      turnNumber,
      maxTurns: level.gameplay.persona.maxTurns,
      isClosing: personaTurn.isClosing,
      ...(shouldEvaluate ? { evaluation: evaluation ?? "pending", awardedXp, isReplay } : {}),
    });
  } catch (error) {
    console.error("Could not process roleplay turn:", error);
    return NextResponse.json({ error: "Could not process that roleplay turn" }, { status: 500 });
  }
}
