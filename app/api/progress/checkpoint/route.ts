import { NextResponse } from "next/server";

import { markLevelInProgress } from "../../../../lib/db";
import { getLevelBySlug } from "../../../../lib/game/content";
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

  const { levelSlug } = body as { levelSlug?: unknown };
  if (typeof levelSlug !== "string") return NextResponse.json({ error: "A level is required" }, { status: 400 });

  const level = getLevelBySlug(levelSlug);
  if (!level) return NextResponse.json({ error: "Unknown level" }, { status: 400 });

  try {
    const progress = await markLevelInProgress({ userId, levelId: level.id });
    return NextResponse.json({ ok: true, ...progress });
  } catch (error) {
    console.error("Could not checkpoint progress:", error);
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }
}
