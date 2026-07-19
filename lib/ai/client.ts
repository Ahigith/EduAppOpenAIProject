import OpenAI from "openai";

import { getSupabaseServerClient, recordAttempt } from "../db";
import {
  DebriefSchema,
  EvalResultSchema,
  type BuilderField,
  type Debrief,
  type EvalResult,
  type MetricDef,
  type NarrativeNode,
  type Decision,
  type Persona,
  type RoleplayTurn,
  type RubricCriterion,
  RoleplayTurnSchema,
} from "../schemas";
import {
  buildDebriefSystemPrompt,
  buildDebriefUserPrompt,
  buildEvalSystemPrompt,
  buildEvalUserPrompt,
  buildRepairPrompt,
  buildRoleplaySystemPrompt,
  FALLBACK_DEBRIEF,
  FALLBACK_ROLEPLAY_TURN,
} from "./prompts";

type OpenAIClientLike = Pick<OpenAI, "chat">;
type DebriefArgs = { levelId: string; userId?: string; levelTopic: string; node: NarrativeNode; decision: Decision; metricDefs: MetricDef[]; metricsBefore: Record<string, number>; metricsAfter: Record<string, number> };
type RoleplayHistory = { role: "player" | "persona"; content: string }[];
type EvaluationPayload = { levelTitle: string; transcript?: { role: "player" | "persona"; content: string; internalNote?: string }[]; builderSubmission?: Record<string, string>; builderFields?: BuilderField[] };
type TestGlobals = typeof globalThis & { __youngEntrepreneursOpenAIClient?: OpenAIClientLike };

function getOpenAIClient(): OpenAIClientLike {
  const testClient = (globalThis as TestGlobals).__youngEntrepreneursOpenAIClient;
  if (testClient) return testClient;
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY must be configured.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getModel(): string {
  const model = process.env.AI_MODEL ?? (process.env.NODE_ENV !== "production" ? process.env.AI_DEV_MODEL : undefined);
  if (!model) throw new Error("AI_MODEL must be configured in production.");
  return model;
}

async function requestJson(systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
  const response = await getOpenAIClient().chat.completions.create({
    model: getModel(), temperature, response_format: { type: "json_object" },
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("OpenAI returned no response content.");
  return content;
}

async function requestValidated<T>(input: { systemPrompt: string; userPrompt: string; temperature: number; parse: (value: unknown) => T }): Promise<T | null> {
  let rawOutput = "";
  try {
    rawOutput = await requestJson(input.systemPrompt, input.userPrompt, input.temperature);
    return input.parse(JSON.parse(rawOutput));
  } catch (firstError) {
    try {
      rawOutput = await requestJson(input.systemPrompt, buildRepairPrompt(rawOutput, firstError instanceof Error ? firstError.message : String(firstError)), input.temperature);
      return input.parse(JSON.parse(rawOutput));
    } catch {
      return null;
    }
  }
}

async function findCachedDebrief(args: DebriefArgs): Promise<Debrief | null> {
  if (!args.userId) return null;
  try {
    const { data, error } = await getSupabaseServerClient().from("attempts").select("score")
      .eq("user_id", args.userId).eq("level_id", args.levelId)
      .contains("payload", { kind: "debrief_cache", nodeId: args.node.id, decisionId: args.decision.id })
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data?.score ? DebriefSchema.parse(data.score) : null;
  } catch (error) {
    console.warn("Could not read debrief cache:", error);
    return null;
  }
}

async function cacheDebrief(args: DebriefArgs, debrief: Debrief): Promise<void> {
  if (!args.userId) return;
  try {
    await recordAttempt({ userId: args.userId, levelId: args.levelId, payload: { kind: "debrief_cache", nodeId: args.node.id, decisionId: args.decision.id }, score: debrief });
  } catch (error) {
    console.warn("Could not store debrief cache:", error);
  }
}

export async function generateDebrief(args: DebriefArgs): Promise<Debrief> {
  const cached = await findCachedDebrief(args);
  if (cached) return cached;
  const result = await requestValidated({ systemPrompt: buildDebriefSystemPrompt(), userPrompt: buildDebriefUserPrompt(args), temperature: 0.7, parse: (value) => DebriefSchema.parse(value) });
  const debrief = result ?? FALLBACK_DEBRIEF;
  await cacheDebrief(args, debrief);
  return debrief;
}

export async function generateRoleplayTurn(persona: Persona, turnNumber: number, history: RoleplayHistory): Promise<RoleplayTurn> {
  const result = await requestValidated({ systemPrompt: buildRoleplaySystemPrompt(persona, turnNumber), userPrompt: JSON.stringify({ history }), temperature: 0.9, parse: (value) => RoleplayTurnSchema.parse(value) });
  return result ?? FALLBACK_ROLEPLAY_TURN;
}

function enforceEvaluationConsistency(result: EvalResult, rubric: RubricCriterion[], passCriteriaCount: number): EvalResult {
  const modelCriteria = new Map(result.criteria.map((criterion) => [criterion.id, criterion]));
  let corrected = modelCriteria.size !== rubric.length;
  const criteria = rubric.map((criterion) => {
    const modelCriterion = modelCriteria.get(criterion.id);
    const points = Math.min(criterion.maxPoints, Math.max(0, modelCriterion?.points ?? 0));
    const passed = points >= criterion.passThreshold;
    const feedback = modelCriterion?.feedback ?? "No evidence was returned for this criterion.";
    if (!modelCriterion || modelCriterion.points !== points || modelCriterion.passed !== passed) corrected = true;
    return { id: criterion.id, points, passed, feedback };
  });
  const overallPassed = criteria.filter((criterion) => criterion.passed).length >= passCriteriaCount;
  if (result.overallPassed !== overallPassed) corrected = true;
  if (corrected) console.warn("Corrected inconsistent AI evaluation result.");
  return { ...result, criteria, overallPassed };
}

export async function evaluateAttempt(rubric: RubricCriterion[], passCriteriaCount: number, context: "roleplay" | "builder", payload: EvaluationPayload): Promise<EvalResult | "pending"> {
  const result = await requestValidated({
    systemPrompt: buildEvalSystemPrompt(rubric, passCriteriaCount, context, payload.builderFields),
    userPrompt: buildEvalUserPrompt(payload), temperature: 0.2, parse: (value) => EvalResultSchema.parse(value),
  });
  return result ? enforceEvaluationConsistency(result, rubric, passCriteriaCount) : "pending";
}
