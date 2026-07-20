import OpenAI from "openai";

import { getSupabaseServerClient, recordAttempt } from "../db";
import {
  DebriefSchema,
  type BuilderField,
  type Debrief,
  type EvalResult,
  type MetricDef,
  type NarrativeNode,
  type Decision,
  type Persona,
  type RoleplayTurn,
  type RubricCriterion,
} from "../schemas";
import {
  buildDebriefSystemPrompt,
  buildDebriefUserPrompt,
  buildRepairPrompt,
  FALLBACK_DEBRIEF,
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
  const playerMessage = history.filter((turn) => turn.role === "player").at(-1)?.content.toLowerCase() ?? "";
  const mentionsCustomer = /\b(students?|parents?|teachers?|children|kids?|famil(?:y|ies)|shoppers?|customers?|buyers?|kirana|office|workers?|teens?)\b/.test(playerMessage);
  const mentionsMoney = /(?:₹|\brs\.?\b|\bprice\b|\bcost\b|\bpay\b|\bsell\b|\bsale\b|\brevenue\b|\bprofit\b|\bmoney\b)/.test(playerMessage);
  const mentionsProblem = /\b(problem|need|difficult|hard|struggle|waste|lack|help)\b/.test(playerMessage);

  if (turnNumber >= persona.maxTurns) {
    return {
      message: mentionsMoney
        ? "Thank you — I can see who this is for and how a sale could work. That was a thoughtful elevator pitch."
        : "Thank you — I understand the idea. Before a real investor meeting, add one clear customer and how a sale makes money.",
      isClosing: true,
      internalNote: mentionsMoney ? "The pitch included a path to money." : "The pitch needs a clearer path to money.",
    };
  }

  if (turnNumber === 1) {
    return {
      message: mentionsProblem
        ? "That problem sounds real. Who exactly feels it most — describe one customer for me."
        : "I’m intrigued. In one sentence, what problem are you solving and who is it for?",
      isClosing: false,
      internalNote: mentionsProblem ? "The founder named a problem and needs a specific customer." : "The founder needs to explain the problem and customer.",
    };
  }

  if (turnNumber === 2) {
    return {
      message: mentionsCustomer
        ? "Good — that is a real customer. Now walk me through one sale: what do they pay, and why choose you?"
        : "Make the customer more specific: who are they, where do they meet this problem, and why do they care?",
      isClosing: false,
      internalNote: mentionsCustomer ? "The customer is specific; Meera is testing the business model." : "The customer remains too broad.",
    };
  }

  return {
    message: mentionsMoney
      ? "That gives me a believable sale. Give me one final sentence that connects the problem, customer, and solution."
      : "I can see the direction. Give me one final sentence on how this becomes a sale.",
    isClosing: false,
    internalNote: mentionsMoney ? "The founder described how money could flow." : "The founder still needs to explain one sale.",
  };
}

export async function evaluateAttempt(rubric: RubricCriterion[], passCriteriaCount: number, context: "roleplay" | "builder", payload: EvaluationPayload): Promise<EvalResult | "pending"> {
  const submission = context === "roleplay"
    ? (payload.transcript ?? []).filter((turn) => turn.role === "player").map((turn) => turn.content).join(" ")
    : Object.values(payload.builderSubmission ?? {}).join(" ");
  const text = submission.toLowerCase();
  const hasIdea = /\S/.test(text);
  const hasCustomer = /\b(students?|parents?|teachers?|children|kids?|famil(?:y|ies)|shoppers?|customers?|buyers?|kirana|office|workers?|teens?)\b/.test(text);
  const hasMoney = /(?:₹|\brs\.?\b|\bprice\b|\bcost\b|\bpay\b|\bsell\b|\bsale\b|\brevenue\b|\bprofit\b|\bmoney\b)/.test(text);

  const criteria = rubric.map((criterion) => {
    const key = `${criterion.id} ${criterion.label} ${criterion.description}`.toLowerCase();
    const evidence = key.includes("customer") ? hasCustomer : key.includes("money") || key.includes("sale") || key.includes("price") ? hasMoney : hasIdea;
    const points = evidence ? criterion.maxPoints : Math.max(0, criterion.passThreshold - 1);
    const passed = points >= criterion.passThreshold;
    const feedback = evidence
      ? `You gave clear evidence for ${criterion.label.toLowerCase()}.`
      : `Add one concrete detail for ${criterion.label.toLowerCase()}.`;
    return { id: criterion.id, points, passed, feedback };
  });
  const overallPassed = criteria.filter((criterion) => criterion.passed).length >= passCriteriaCount;
  const strengths = criteria.filter((criterion) => criterion.passed).slice(0, 3).map((criterion) => `${criterion.id}: clear evidence included.`);
  const improvements = criteria.filter((criterion) => !criterion.passed).slice(0, 3).map((criterion) => `${criterion.id}: add one concrete detail.`);

  return {
    criteria,
    overallPassed,
    strengths,
    improvements,
    encouragement: overallPassed ? "Nice work — your pitch covers the key details." : "Good start — use the feedback to make your next attempt stronger.",
  };
}
