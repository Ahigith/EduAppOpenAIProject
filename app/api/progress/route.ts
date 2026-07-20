import { NextResponse } from "next/server";

import { getProgress } from "../../../lib/db";
import { getAnonymousSessionUserId } from "../../../lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionUserId = await getAnonymousSessionUserId();
  const requestedUserId = new URL(request.url).searchParams.get("userId");
  if (!sessionUserId || !requestedUserId || requestedUserId !== sessionUserId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  try {
    const progress = await getProgress(sessionUserId);
    return NextResponse.json(progress.map((item) => ({
      levelId: item.level_id,
      status: item.status,
      xpEarned: item.xp_earned,
    })));
  } catch {
    return NextResponse.json({ error: "Could not load progress" }, { status: 500 });
  }
}
