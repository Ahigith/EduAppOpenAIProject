"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** "fresh" = opened but untouched, "in_progress" = the player has unsaved work, "results" = scoring screen. */
export type LevelPhase = "fresh" | "in_progress" | "results";

const LevelPhaseContext = createContext<{ phase: LevelPhase; setPhase: (phase: LevelPhase) => void }>({ phase: "fresh", setPhase: () => {} });

export function LevelPhaseProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<LevelPhase>("fresh");
  return <LevelPhaseContext.Provider value={{ phase, setPhase }}>{children}</LevelPhaseContext.Provider>;
}

export function useLevelPhase() { return useContext(LevelPhaseContext).phase; }

/** Mechanic clients call this once with their current phase so the header can guard navigation. */
export function useReportLevelPhase(phase: LevelPhase) {
  const { setPhase } = useContext(LevelPhaseContext);
  useEffect(() => { setPhase(phase); }, [phase, setPhase]);
}
