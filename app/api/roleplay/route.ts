import { NextResponse } from "next/server";

import { evaluateAttempt } from "../../../lib/ai/client";
import { generateRoleplayAttemptTurn } from "../../../lib/ai/roleplay-flow";
import { appendTranscript, getProgress, getSupabaseServerClient, recordAttempt, upsertProgress } from "../../../lib/db";
import { getLevelBySlug } from "../../../lib/game/content";
import { getAnonymousSessionUserId } from "../../../lib/session";
import type { EvalResult } from "../../../lib/schemas";

type TranscriptRow = { role: "player" | "persona"; content: string };
type InternalNote = { turnNumber: number; content: string };
type RoleplayPayload = { kind: "roleplay"; completed?: boolean; internalNotes?: InternalNote[] };

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
    const { slug, message } = body as { slug?: unknown; message?: unknown };
    if (typeof slug !== "string" || typeof message !== "string" || !message.trim() || message.length > 800) {
      return NextResponse.json({ error: "A non-empty message of 800 characters or fewer is required" }, { status: 400 });
    }

    const level = getLevelBySlug(slug);
    if (!level || level.gameplay.kind !== "roleplay") {
      return NextResponse.json({ error: "This is not a roleplay level" }, { status: 400 });
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

    const existingPayload = readRoleplayPayload(existingAttempt?.payload);
    if (existingPayload?.completed) {
      return NextResponse.json({ error: "This roleplay attempt is already complete" }, { status: 409 });
    }

    const attempt = existingAttempt ?? await recordAttempt({
      userId,
      levelId: level.id,
      payload: { kind: "roleplay", internalNotes: [] },
    });
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
    const completedPayload: RoleplayPayload = { kind: "roleplay", internalNotes, completed: shouldEvaluate };
    let evaluation: EvalResult | "pending" | undefined;
    let awardedXp = 0;

    if (shouldEvaluate) {
      evaluation = await evaluateAttempt(level.gameplay.rubric, level.gameplay.passCriteriaCount, "roleplay", {
        levelTitle: level.title,
        transcript: transcriptWithNotes([...transcript, { role: "persona", content: personaTurn.message }], internalNotes),
      });
      if (evaluation !== "pending" && evaluation.overallPassed) {
        const wasCompleted = (await getProgress(userId)).some((progress) => progress.level_id === level.id && progress.status === "completed");
        awardedXp = wasCompleted ? 0 : level.xpReward;
        await upsertProgress({ userId, levelId: level.id, status: "completed", xpEarned: awardedXp });
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
      ...(shouldEvaluate ? { evaluation: evaluation ?? "pending", awardedXp } : {}),
    });
  } catch (error) {
    console.error("Could not process roleplay turn:", error);
    return NextResponse.json({ error: "Could not process that roleplay turn" }, { status: 500 });
  }
}
