import { notFound } from "next/navigation";
import { getLevelBySlug } from "../../../lib/game/content";
import { shuffleSteps } from "../../../lib/game/scoring";
import PlayClient from "./play-client";
import NarrativeClient from "./narrative-client";
import RoleplayClient from "./roleplay-client";
import BuilderClient from "./builder-client";
export default async function PlayPage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const level=getLevelBySlug(slug); if(!level) notFound(); if(level.gameplay.kind==="narrative") return <NarrativeClient slug={slug} nodes={level.gameplay.nodes} metrics={level.gameplay.metrics} initialNodeId={level.gameplay.startNodeId} initialMetrics={Object.fromEntries(level.gameplay.metrics.map(m=>[m.id,m.start]))}/>; if(level.gameplay.kind==="sort_buckets") return <PlayClient slug={slug} kind="sort_buckets" scenario={level.gameplay.scenario} items={level.gameplay.items} buckets={level.gameplay.buckets}/>; if(level.gameplay.kind==="sequence") return <PlayClient slug={slug} kind="sequence" scenario={level.gameplay.scenario} steps={shuffleSteps(level.gameplay.steps, 42)}/>; if(level.gameplay.kind==="roleplay") return <RoleplayClient slug={slug} title={level.title} setup={level.gameplay.setup} persona={level.gameplay.persona} rubric={level.gameplay.rubric} />; if(level.gameplay.kind==="builder") return <BuilderClient slug={slug} title={level.title} instructions={level.gameplay.instructions} fields={level.gameplay.fields} rubric={level.gameplay.rubric} />; notFound(); }
