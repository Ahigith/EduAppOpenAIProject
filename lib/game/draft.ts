// Draft state: the unscored work a player has on screen when they leave a level.
// Saved into attempts.payload under kind "level_draft" so "Save & Go Home"
// can be resumed later, on any device, after a re-login.
//
// A draft is never a score and never awards XP. Restoring one is best-effort:
// content files can change between sessions, so every restore helper drops ids
// that no longer exist rather than rendering a broken board.

import { z } from "zod";

export const LevelDraftSchema = z.discriminatedUnion("mechanic", [
  z.object({
    mechanic: z.literal("sort_buckets"),
    answers: z.record(z.string(), z.string()),
  }),
  z.object({
    mechanic: z.literal("sequence"),
    order: z.array(z.string()),
  }),
  z.object({
    mechanic: z.literal("builder"),
    submission: z.record(z.string(), z.string()),
  }),
  z.object({
    mechanic: z.literal("roleplay"),
    messages: z.array(z.object({ role: z.enum(["player", "persona"]), content: z.string() })),
    turnNumber: z.number().int().min(0),
    input: z.string().default(""),
  }),
  z.object({
    mechanic: z.literal("narrative"),
    currentNodeId: z.string(),
    metrics: z.record(z.string(), z.number()),
  }),
]);
export type LevelDraft = z.infer<typeof LevelDraftSchema>;

export const DraftPayloadSchema = z.object({
  kind: z.literal("level_draft"),
  draft: LevelDraftSchema,
  isReplay: z.boolean().default(false),
});
export type DraftPayload = z.infer<typeof DraftPayloadSchema>;

export const DRAFT_PAYLOAD_KIND = "level_draft" as const;

/** Parses a draft straight off the wire or out of attempts.payload. Never throws. */
export function parseLevelDraft(value: unknown): LevelDraft | null {
  const parsed = LevelDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Reads a stored attempts.payload row back into a draft. Never throws. */
export function parseDraftPayload(value: unknown): DraftPayload | null {
  const parsed = DraftPayloadSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Narrows a draft to one mechanic so a client only ever restores its own shape. */
export function draftFor<K extends LevelDraft["mechanic"]>(
  draft: LevelDraft | null | undefined,
  mechanic: K,
): Extract<LevelDraft, { mechanic: K }> | null {
  return draft?.mechanic === mechanic ? (draft as Extract<LevelDraft, { mechanic: K }>) : null;
}

/** Keeps only placements whose item and bucket both still exist in the content file. */
export function restoreSortAnswers(
  answers: Record<string, string>,
  itemIds: string[],
  bucketIds: string[],
): Record<string, string> {
  const items = new Set(itemIds);
  const buckets = new Set(bucketIds);
  return Object.fromEntries(
    Object.entries(answers).filter(([itemId, bucketId]) => items.has(itemId) && buckets.has(bucketId)),
  );
}

/** Rebuilds the player's chosen order; steps the draft never mentioned keep their shuffled place at the end. */
export function restoreSequenceOrder<T extends { id: string }>(order: string[], steps: T[]): T[] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const restored: T[] = [];
  for (const id of order) {
    const step = byId.get(id);
    if (step && !restored.includes(step)) restored.push(step);
  }
  for (const step of steps) if (!restored.includes(step)) restored.push(step);
  return restored;
}

/** Keeps only text for fields that still exist; every other field starts empty. */
export function restoreBuilderSubmission(
  submission: Record<string, string>,
  fieldIds: string[],
): Record<string, string> {
  return Object.fromEntries(fieldIds.map((id) => [id, submission[id] ?? ""]));
}

/** A narrative draft is only usable if its node still exists; otherwise the story restarts. */
export function restoreNarrativePosition(
  draft: { currentNodeId: string; metrics: Record<string, number> } | null,
  nodeIds: string[],
  startMetrics: Record<string, number>,
): { currentNodeId: string; metrics: Record<string, number> } | null {
  if (!draft || !nodeIds.includes(draft.currentNodeId)) return null;
  return {
    currentNodeId: draft.currentNodeId,
    metrics: Object.fromEntries(
      Object.keys(startMetrics).map((id) => [id, draft.metrics[id] ?? startMetrics[id]]),
    ),
  };
}
