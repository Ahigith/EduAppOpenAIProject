import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { DRAFT_PAYLOAD_KIND, parseDraftPayload, type DraftPayload, type LevelDraft } from "./game/draft";
import type { ProgressStatus } from "./schemas";

type JsonPayload = Record<string, unknown> | unknown[];

export type AppUser = {
  id: string;
  handle: string;
  created_at: string;
};

export async function getOrCreateUserByHandle(handle: string): Promise<{ user: AppUser; isNew: boolean }> {
  const supabase = getSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id, handle, created_at")
    .eq("handle", handle)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return { user: existing as AppUser, isNew: false };

  const id = randomUUID();
  const { data, error } = await supabase
    .from("users")
    .insert({ id, handle })
    .select("id, handle, created_at")
    .single();

  if (error) throw error;
  return { user: data as AppUser, isNew: true };
}

function getRequiredEnvironmentVariable(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured.`);
  }
  return value;
}

export function getSupabaseServerClient(): SupabaseClient {
  return createClient(
    getRequiredEnvironmentVariable("SUPABASE_URL"),
    getRequiredEnvironmentVariable("SUPABASE_ANON_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getOrCreateAnonUser(existingUserId?: string): Promise<AppUser> {
  const supabase = getSupabaseServerClient();

  if (existingUserId && isUuid(existingUserId)) {
    const { data, error } = await supabase
      .from("users")
      .select("id, handle, created_at")
      .eq("id", existingUserId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as AppUser;
  }

  const id = randomUUID();
  const { data, error } = await supabase
    .from("users")
    .insert({ id, handle: `founder-${id.slice(0, 8)}` })
    .select("id, handle, created_at")
    .single();

  if (error) throw error;
  return data as AppUser;
}

export async function getProgress(userId: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("progress")
    .select("user_id, level_id, status, xp_earned, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function upsertProgress(input: {
  userId: string;
  levelId: string;
  status: ProgressStatus;
  xpEarned: number;
}) {
  const { data, error } = await getSupabaseServerClient()
    .from("progress")
    .upsert(
      {
        user_id: input.userId,
        level_id: input.levelId,
        status: input.status,
        xp_earned: input.xpEarned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,level_id" },
    )
    .select("user_id, level_id, status, xp_earned, updated_at")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Checkpoint a level as in_progress without ever touching xp_earned.
 * A level that is already completed keeps its status and banked XP.
 */
export async function markLevelInProgress(input: { userId: string; levelId: string }) {
  const supabase = getSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("progress")
    .select("status, xp_earned")
    .eq("user_id", input.userId)
    .eq("level_id", input.levelId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.status === "completed") return { status: "completed" as ProgressStatus, xpEarned: existing.xp_earned as number };

  if (existing) {
    const { error } = await supabase
      .from("progress")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("user_id", input.userId)
      .eq("level_id", input.levelId);
    if (error) throw error;
    return { status: "in_progress" as ProgressStatus, xpEarned: existing.xp_earned as number };
  }

  const { error } = await supabase
    .from("progress")
    .insert({ user_id: input.userId, level_id: input.levelId, status: "in_progress", xp_earned: 0 });
  if (error) throw error;
  return { status: "in_progress" as ProgressStatus, xpEarned: 0 };
}

export async function recordAttempt(input: {
  userId: string;
  levelId: string;
  payload: JsonPayload;
  score?: JsonPayload;
}) {
  const { data, error } = await getSupabaseServerClient()
    .from("attempts")
    .insert({
      user_id: input.userId,
      level_id: input.levelId,
      payload: input.payload,
      score: input.score ?? null,
    })
    .select("id, user_id, level_id, payload, score, created_at")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Saves the player's unscored work-in-progress for a level.
 *
 * A first-pass draft and a practice-replay draft are kept as separate attempt rows
 * (they differ on isReplay), so practising can never overwrite the work that led to
 * the banked badge. Within one of those passes the draft row is updated in place.
 */
export async function saveLevelDraft(input: {
  userId: string;
  levelId: string;
  draft: LevelDraft;
  isReplay: boolean;
}) {
  const supabase = getSupabaseServerClient();
  const payload: DraftPayload = { kind: DRAFT_PAYLOAD_KIND, draft: input.draft, isReplay: input.isReplay };

  const { data: existing, error: findError } = await supabase
    .from("attempts")
    .select("id, payload")
    .eq("user_id", input.userId)
    .eq("level_id", input.levelId)
    .contains("payload", { kind: DRAFT_PAYLOAD_KIND })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  const existingPayload = parseDraftPayload(existing?.payload);
  if (existing && existingPayload?.isReplay === input.isReplay) {
    const { error } = await supabase.from("attempts").update({ payload }).eq("id", existing.id);
    if (error) throw error;
    return;
  }

  await recordAttempt({ userId: input.userId, levelId: input.levelId, payload });
}

/** The most recent draft for this player and level, or null if they have never saved one. */
export async function getLatestLevelDraft(input: { userId: string; levelId: string }): Promise<LevelDraft | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("attempts")
    .select("payload")
    .eq("user_id", input.userId)
    .eq("level_id", input.levelId)
    .contains("payload", { kind: DRAFT_PAYLOAD_KIND })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return parseDraftPayload(data?.payload)?.draft ?? null;
}

export async function appendTranscript(input: {
  attemptId: string;
  role: "player" | "persona";
  content: string;
}) {
  const { data, error } = await getSupabaseServerClient()
    .from("transcripts")
    .insert({ attempt_id: input.attemptId, role: input.role, content: input.content })
    .select("id, attempt_id, role, content, created_at")
    .single();

  if (error) throw error;
  return data;
}
