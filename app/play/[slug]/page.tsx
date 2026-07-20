import { notFound } from "next/navigation";
import { getLatestLevelDraft, getProgress } from "../../../lib/db";
import { getLevelBySlug, loadAllLevels } from "../../../lib/game/content";
import { draftFor, restoreNarrativePosition, restoreSequenceOrder, type LevelDraft } from "../../../lib/game/draft";
import { hasCompletedLevel } from "../../../lib/game/replay";
import { shuffleSteps } from "../../../lib/game/scoring";
import { getAuthenticatedSessionUserId } from "../../../lib/session";
import PlayClient from "./play-client";
import NarrativeClient from "./narrative-client";
import RoleplayClient from "./roleplay-client";
import BuilderClient from "./builder-client";
import LevelHeader from "./level-header";
import { LevelPhaseProvider } from "./level-phase";

/** A missing session or an unreachable database must never block play — the level just starts blank. */
async function loadSavedState(levelId: string): Promise<{ draft: LevelDraft | null; completed: boolean }> {
  const userId = await getAuthenticatedSessionUserId();
  if (!userId) return { draft: null, completed: false };
  try {
    const [draft, progress] = await Promise.all([getLatestLevelDraft({ userId, levelId }), getProgress(userId)]);
    return { draft, completed: hasCompletedLevel(progress ?? [], levelId) };
  } catch (error) {
    console.error("Could not load saved level state:", error);
    return { draft: null, completed: false };
  }
}

export default async function PlayPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const level=getLevelBySlug(slug); if(!level) notFound();
  const levels=loadAllLevels(); const nextSlug=levels[levels.findIndex((item)=>item.slug===slug)+1]?.slug;
  const gameplay=level.gameplay;
  const {draft,completed}=await loadSavedState(level.id);

  let body = null;
  if (gameplay.kind === "narrative") {
    const startMetrics = Object.fromEntries(gameplay.metrics.map((m) => [m.id, m.start]));
    const resumed = restoreNarrativePosition(draftFor(draft, "narrative"), gameplay.nodes.map((node) => node.id), startMetrics);
    body = <NarrativeClient slug={slug} nodes={gameplay.nodes} metrics={gameplay.metrics} initialNodeId={resumed?.currentNodeId ?? gameplay.startNodeId} initialMetrics={resumed?.metrics ?? startMetrics} startNodeId={gameplay.startNodeId} startMetrics={startMetrics}/>;
  } else if (gameplay.kind === "sort_buckets") {
    body = <PlayClient slug={slug} kind="sort_buckets" scenario={gameplay.scenario} items={gameplay.items} buckets={gameplay.buckets} initialAnswers={draftFor(draft, "sort_buckets")?.answers}/>;
  } else if (gameplay.kind === "sequence") {
    const shuffled = shuffleSteps(gameplay.steps, 42);
    const savedOrder = draftFor(draft, "sequence")?.order;
    body = <PlayClient slug={slug} kind="sequence" scenario={gameplay.scenario} steps={shuffled} initialOrder={savedOrder ? restoreSequenceOrder(savedOrder, shuffled).map((step) => step.id) : undefined}/>;
  } else if (gameplay.kind === "roleplay") {
    const saved = draftFor(draft, "roleplay");
    body = <RoleplayClient slug={slug} title={level.title} setup={gameplay.setup} persona={gameplay.persona} rubric={gameplay.rubric} nextSlug={nextSlug} initialMessages={saved?.messages} initialTurnNumber={saved?.turnNumber} initialInput={saved?.input}/>;
  } else if (gameplay.kind === "builder") {
    body = <BuilderClient slug={slug} title={level.title} instructions={gameplay.instructions} fields={gameplay.fields} rubric={gameplay.rubric} nextSlug={nextSlug} initialSubmission={draftFor(draft, "builder")?.submission}/>;
  }

  if(!body) notFound();
  return <LevelPhaseProvider><LevelHeader title={level.title} slug={slug} practicing={completed}/>{body}</LevelPhaseProvider>;
}
