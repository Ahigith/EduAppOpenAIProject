import { NextResponse } from "next/server";

import { evaluateAttempt } from "../../../lib/ai/client";
import { getProgress, recordAttempt, upsertProgress } from "../../../lib/db";
import { getLevelBySlug } from "../../../lib/game/content";
import { getAnonymousSessionUserId } from "../../../lib/session";
import type { LevelDefinition } from "../../../lib/schemas";

export const runtime = "nodejs";

type BuilderLevel = LevelDefinition & { gameplay: Extract<LevelDefinition["gameplay"], { kind: "builder" }> };

type BuilderDependencies = {
  getUserId: () => Promise<string | undefined>;
  getLevel: (slug: string) => LevelDefinition | undefined;
  evaluate: typeof evaluateAttempt;
  getProgress: typeof getProgress;
  recordAttempt: typeof recordAttempt;
  upsertProgress: typeof upsertProgress;
};

const defaultDependencies: BuilderDependencies = {
  getUserId: getAnonymousSessionUserId,
  getLevel: getLevelBySlug,
  evaluate: evaluateAttempt,
  getProgress,
  recordAttempt,
  upsertProgress,
};

function isBuilderLevel(level: LevelDefinition | undefined): level is BuilderLevel {
  return level?.gameplay.kind === "builder";
}

function readSubmission(value: unknown, level: BuilderLevel): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const submission = value as Record<string, unknown>;
  const fields = level.gameplay.fields;
  if (Object.keys(submission).length !== fields.length) return null;

  const cleanSubmission: Record<string, string> = {};
  for (const field of fields) {
    const answer = submission[field.id];
    if (typeof answer !== "string" || !answer.trim() || answer.length > field.maxChars) return null;
    cleanSubmission[field.id] = answer.trim();
  }
  return cleanSubmission;
}

export function createBuilderPostHandler(dependencies: BuilderDependencies = defaultDependencies) {
  return async function POST(request: Request) {
    try {
      const userId = await dependencies.getUserId();
      if (!userId) return NextResponse.json({ error: "No session" }, { status: 401 });

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid builder request" }, { status: 400 });
      }
      if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid builder request" }, { status: 400 });

      const { slug, submission } = body as { slug?: unknown; submission?: unknown };
      if (typeof slug !== "string") return NextResponse.json({ error: "A builder level is required" }, { status: 400 });

      const level = dependencies.getLevel(slug);
      if (!isBuilderLevel(level)) return NextResponse.json({ error: "This is not a builder level" }, { status: 400 });

      const cleanSubmission = readSubmission(submission, level);
      if (!cleanSubmission) return NextResponse.json({ error: "Every builder field needs a non-empty answer within its character limit" }, { status: 400 });

      const evaluation = await dependencies.evaluate(level.gameplay.rubric, level.gameplay.passCriteriaCount, "builder", {
        levelTitle: level.title,
        builderSubmission: cleanSubmission,
        builderFields: level.gameplay.fields,
      });
      await dependencies.recordAttempt({
        userId,
        levelId: level.id,
        payload: { kind: "builder", submission: cleanSubmission },
        score: evaluation === "pending" ? { status: "pending" } : evaluation,
      });

      let awardedXp = 0;
      if (evaluation !== "pending" && evaluation.overallPassed) {
        const wasCompleted = (await dependencies.getProgress(userId)).some(
          (progress) => progress.level_id === level.id && progress.status === "completed",
        );
        if (!wasCompleted) {
          awardedXp = level.xpReward;
          await dependencies.upsertProgress({ userId, levelId: level.id, status: "completed", xpEarned: awardedXp });
        }
      }

      return NextResponse.json({ evaluation, awardedXp });
    } catch (error) {
      console.error("Could not evaluate builder submission:", error);
      return NextResponse.json({ error: "Could not evaluate that builder submission" }, { status: 500 });
    }
  };
}

export const POST = createBuilderPostHandler();
