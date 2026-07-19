import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "../../../lib/db";
import { loadAllLevels } from "../../../lib/game/content";

export const runtime = "nodejs";

export async function GET() {
  const contentLevels = loadAllLevels().length;
  let dbConnected = false;

  try {
    const { error } = await getSupabaseServerClient().from("levels").select("id", { head: true }).limit(1);
    dbConnected = !error;
  } catch {
    dbConnected = false;
  }

  const ok = dbConnected && contentLevels > 0;
  return NextResponse.json({ ok, dbConnected, contentLevels }, { status: ok ? 200 : 503 });
}
