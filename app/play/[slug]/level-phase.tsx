"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import type { LevelDraft } from "../../../lib/game/draft";

/** "fresh" = opened but untouched, "in_progress" = the player has unsaved work, "results" = scoring screen. */
export type LevelPhase = "fresh" | "in_progress" | "results";

type ReadDraft = () => LevelDraft | null;

const LevelPhaseContext = createContext<{
  phase: LevelPhase;
  setPhase: (phase: LevelPhase) => void;
  draftRef: RefObject<ReadDraft | null>;
}>({ phase: "fresh", setPhase: () => {}, draftRef: { current: null } });

export function LevelPhaseProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<LevelPhase>("fresh");
  const draftRef = useRef<ReadDraft | null>(null);
  return <LevelPhaseContext.Provider value={{ phase, setPhase, draftRef }}>{children}</LevelPhaseContext.Provider>;
}

export function useLevelPhase() { return useContext(LevelPhaseContext).phase; }

/** Mechanic clients call this once with their current phase so the header can guard navigation. */
export function useReportLevelPhase(phase: LevelPhase) {
  const { setPhase } = useContext(LevelPhaseContext);
  useEffect(() => { setPhase(phase); }, [phase, setPhase]);
}

/**
 * Mechanic clients call this with a getter for their current on-screen work.
 * The header reads it when the player saves. Returning null means "nothing worth
 * saving" — a fresh board or a finished results screen.
 */
export function useReportLevelDraft(getDraft: ReadDraft) {
  const { draftRef } = useContext(LevelPhaseContext);
  useEffect(() => { draftRef.current = getDraft; });
}

/** Header-side accessor: reads whatever the active mechanic client last reported. */
export function useReadLevelDraft(): ReadDraft {
  const { draftRef } = useContext(LevelPhaseContext);
  return () => draftRef.current?.() ?? null;
}
