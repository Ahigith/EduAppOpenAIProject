import { loadEnvConfig } from "@next/env";

import { getSupabaseServerClient } from "../lib/db";
import { loadAllLevels } from "../lib/game/content";

loadEnvConfig(process.cwd());

async function seedLevels(): Promise<void> {
  const levels = loadAllLevels();
  const rows = levels.map((level) => ({
    id: level.id,
    slug: level.slug,
    topic: level.topic,
    tier: level.tier,
    xp_reward: level.xpReward,
    order_index: level.orderIndex,
  }));
  const { error } = await getSupabaseServerClient().from("levels").upsert(rows, { onConflict: "id" });

  if (error) throw error;
  console.log(`Seeded ${rows.length} levels.`);
}

void seedLevels().catch((error: unknown) => {
  console.error("Level seeding failed:", error);
  process.exitCode = 1;
});
