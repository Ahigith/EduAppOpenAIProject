import { resolveXpAward } from "./replay";

export function roleplayRestartState(maxTurns: number) {
  return { turnNumber: 0, maxTurns, messages: [] as { role: "player" | "persona"; content: string }[] };
}

export function roleplayXpAward(alreadyCompleted: boolean, xpReward: number): number {
  return resolveXpAward(alreadyCompleted, xpReward).awardedXp;
}
