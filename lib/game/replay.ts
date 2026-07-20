/** A level's XP is banked on the first pass only. Later passes are practice replays worth 0 XP. */
export type XpAward = { isReplay: boolean; awardedXp: number };

export function resolveXpAward(alreadyCompleted: boolean, xpReward: number): XpAward {
  return alreadyCompleted ? { isReplay: true, awardedXp: 0 } : { isReplay: false, awardedXp: xpReward };
}

type ProgressRow = { level_id: string; status: string };

export function hasCompletedLevel(progress: ProgressRow[], levelId: string): boolean {
  return progress.some((row) => row.level_id === levelId && row.status === "completed");
}
