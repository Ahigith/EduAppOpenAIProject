import { notFound } from "next/navigation";
import { getLevelBySlug, loadAllLevels } from "../../../lib/game/content";
import { shuffleSteps } from "../../../lib/game/scoring";
import PlayClient from "./play-client";
import NarrativeClient from "./narrative-client";
import RoleplayClient from "./roleplay-client";
import BuilderClient from "./builder-client";
import LevelHeader from "./level-header";
import { LevelPhaseProvider } from "./level-phase";

export default async function PlayPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const level=getLevelBySlug(slug); if(!level) notFound();
  const levels=loadAllLevels(); const nextSlug=levels[levels.findIndex((item)=>item.slug===slug)+1]?.slug;
  const gameplay=level.gameplay;
  const body =
    gameplay.kind==="narrative" ? <NarrativeClient slug={slug} nodes={gameplay.nodes} metrics={gameplay.metrics} initialNodeId={gameplay.startNodeId} initialMetrics={Object.fromEntries(gameplay.metrics.map(m=>[m.id,m.start]))}/> :
    gameplay.kind==="sort_buckets" ? <PlayClient slug={slug} kind="sort_buckets" scenario={gameplay.scenario} items={gameplay.items} buckets={gameplay.buckets}/> :
    gameplay.kind==="sequence" ? <PlayClient slug={slug} kind="sequence" scenario={gameplay.scenario} steps={shuffleSteps(gameplay.steps, 42)}/> :
    gameplay.kind==="roleplay" ? <RoleplayClient slug={slug} title={level.title} setup={gameplay.setup} persona={gameplay.persona} rubric={gameplay.rubric} nextSlug={nextSlug}/> :
    gameplay.kind==="builder" ? <BuilderClient slug={slug} title={level.title} instructions={gameplay.instructions} fields={gameplay.fields} rubric={gameplay.rubric} nextSlug={nextSlug}/> :
    null;
  if(!body) notFound();
  return <LevelPhaseProvider><LevelHeader title={level.title}/>{body}</LevelPhaseProvider>;
}
