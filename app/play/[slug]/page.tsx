import { notFound } from "next/navigation";
import { getLevelBySlug } from "../../../lib/game/content";
import { shuffleSteps } from "../../../lib/game/scoring";
import PlayClient from "./play-client";
export default async function PlayPage({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const level=getLevelBySlug(slug); if(!level || (level.gameplay.kind!=="sort_buckets"&&level.gameplay.kind!=="sequence")) notFound(); if(level.gameplay.kind==="sort_buckets") return <PlayClient slug={slug} kind="sort_buckets" scenario={level.gameplay.scenario} items={level.gameplay.items} buckets={level.gameplay.buckets}/>; return <PlayClient slug={slug} kind="sequence" scenario={level.gameplay.scenario} steps={shuffleSteps(level.gameplay.steps, 42)}/>; }
