import { NextResponse } from "next/server";

import { markLevelInProgress, saveLevelDraft } from "../../../../lib/db";
import { getLevelBySlug } from "../../../../lib/game/content";
import { parseLevelDraft } from "../../../../lib/game/draft";
import { getAuthenticatedSessionUserId } from "../../../../lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getAuthenticatedSessionUserId();
  if (!userId) return NextResponse.json({ error: "No session" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid checkpoint request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid checkpoint request" }, { status: 400 });

  const { levelSlug, draft } = body as { levelSlug?: unknown; draft?: unknown };
  if (typeof levelSlug !== "string") return NextResponse.json({ error: "A level is required" }, { status: 400 });

  const level = getLevelBySlug(levelSlug);
  if (!level) return NextResponse.json({ error: "Unknown level" }, { status: 400 });

  try {
    const progress = await markLevelInProgress({ userId, levelId: level.id });

    // A draft is optional: a fresh board or a finished results screen sends none.
    // An unparseable draft never fails the checkpoint — the status save still counts.
    const parsedDraft = draft === undefined ? null : parseLevelDraft(draft);
    if (parsedDraft) {
      await saveLevelDraft({
        userId,
        levelId: level.id,
        draft: parsedDraft,
        isReplay: progress.status === "completed",
      });
    }

    return NextResponse.json({ ok: true, ...progress, draftSaved: Boolean(parsedDraft) });
  } catch (error) {
    console.error("Could not checkpoint progress:", error);
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }
}
