// lib/schemas.ts — FROZEN CONTRACTS (humans only; agents import, never edit)
// TypeScript types are inferred from these Zod schemas so runtime validation
// and compile-time types can never drift apart.
//
// Structure: 7 topics x 2 tiers, each level uses one of 5 gameplay mechanics.
// sort_buckets and sequence are scored in code (lib/game/scoring.ts) — no AI.
// narrative uses the AI narrator; roleplay and builder use the AI evaluator.

import { z } from "zod";

/* ----------------------------- Topics and tiers ----------------------------- */

export const TopicSchema = z.enum([
  "selling",          // how to sell: talking to customers, objections, closing
  "pitching",         // elevator pitch, investor conversations
  "business_model",   // components of a business model, how value is created
  "industry",         // understanding an industry, competition, positioning
  "news",             // reading news like an entrepreneur: opportunity/threat
  "product_pipeline", // ideation -> development -> production -> logistics -> shelf
  "finance",          // revenue, costs, margins, P&L, unit economics
]);
export type Topic = z.infer<typeof TopicSchema>;

export const TierSchema = z.union([z.literal(1), z.literal(2)]);
export type Tier = z.infer<typeof TierSchema>;

/* --------------------------- Metrics (narrative) ---------------------------- */
// Each narrative level defines its OWN metrics (cash, customers, insight, etc.)
// The engine renders whatever is defined here — metric names are never hardcoded.

export const MetricDefSchema = z.object({
  id: z.string(),                        // "cash"
  label: z.string().max(30),             // "Cash in Bank"
  start: z.number().int(),
  format: z.enum(["inr", "number", "score"]).default("number"),
});
export type MetricDef = z.infer<typeof MetricDefSchema>;

// metricId -> delta applied when a decision is taken
export const MetricDeltasSchema = z.record(z.string(), z.number().int());
export type MetricDeltas = z.infer<typeof MetricDeltasSchema>;

/* ------------------------- Mechanic 1: narrative ---------------------------- */

export const DecisionSchema = z.object({
  id: z.string(),
  label: z.string().max(120),            // button text
  metricDeltas: MetricDeltasSchema,      // keys must exist in the level's metrics
  nextNodeId: z.string().nullable(),     // null = this branch ends the level
  // Grounding for the AI debrief — humans author these, GPT-5.6 elaborates:
  outcomeSummary: z.string().max(400),   // what happens in-story
  realWorldParallel: z.string().max(400),// what real companies do (no brand names)
  quality: z.enum(["strong", "mixed", "weak"]),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const NarrativeNodeSchema = z.object({
  id: z.string(),
  title: z.string().max(80),
  narrative: z.string().max(1200),       // the scene, second person, present tense
  imageHint: z.string().optional(),
  decisions: z.array(DecisionSchema).min(2).max(4),
});
export type NarrativeNode = z.infer<typeof NarrativeNodeSchema>;

/* --------------------- Mechanics 2+3: sort_buckets, sequence ----------------- */
// Both scored deterministically in code. `explain` strings ARE the feedback —
// write them well; no AI is called for these levels.

export const BucketSchema = z.object({
  id: z.string(),                        // "value_proposition"
  label: z.string().max(60),             // "Value Proposition"
  hint: z.string().max(200).optional(),  // shown on tap/hover
});

export const SortItemSchema = z.object({
  id: z.string(),
  label: z.string().max(160),            // "Kids love the crunchy almond centre"
  correctBucket: z.string(),             // must match a bucket id
  explain: z.string().max(300),          // shown after scoring, right or wrong
});

export const SequenceStepSchema = z.object({
  id: z.string(),
  label: z.string().max(120),
  explain: z.string().max(300),          // why this step sits here
});

/* -------------------- Mechanics 4+5: roleplay, builder ---------------------- */

export const RubricCriterionSchema = z.object({
  id: z.string(),                        // "clarity"
  label: z.string().max(60),
  description: z.string().max(300),      // what "good" looks like — fed to evaluator
  maxPoints: z.number().int().min(1).max(10),
  passThreshold: z.number().int(),
});
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["investor", "customer", "buyer", "supplier"]),
  traits: z.array(z.string()).min(2).max(5),
  background: z.string().max(400),
  objections: z.array(z.string()).min(1).max(4),
  maxTurns: z.number().int().min(3).max(10),
  warmth: z.enum(["friendly", "neutral", "tough"]).default("neutral"), // tier 1 friendly, tier 2 tough
});
export type Persona = z.infer<typeof PersonaSchema>;

export const BuilderFieldSchema = z.object({
  id: z.string(),                        // "customer_segment"
  label: z.string().max(60),
  prompt: z.string().max(300),           // the question the student answers
  placeholder: z.string().max(120).optional(),
  maxChars: z.number().int().min(50).max(1500).default(500),
});
export type BuilderField = z.infer<typeof BuilderFieldSchema>;

/* ----------------------------- Gameplay union ------------------------------- */

export const GameplaySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("narrative"),
    metrics: z.array(MetricDefSchema).min(1).max(4),
    startNodeId: z.string(),
    nodes: z.array(NarrativeNodeSchema).min(2),
  }),
  z.object({
    kind: z.literal("sort_buckets"),
    scenario: z.string().max(1200),      // framing, usually a ChocoNation moment
    buckets: z.array(BucketSchema).min(2).max(6),
    items: z.array(SortItemSchema).min(5).max(16),
    passPercent: z.number().int().min(50).max(100).default(70),
  }),
  z.object({
    kind: z.literal("sequence"),
    scenario: z.string().max(1200),
    steps: z.array(SequenceStepSchema).min(4).max(10), // ARRAY ORDER = CORRECT ORDER; UI shuffles for play
    passPercent: z.number().int().min(50).max(100).default(70),
  }),
  z.object({
    kind: z.literal("roleplay"),
    setup: z.string().max(800),
    persona: PersonaSchema,
    rubric: z.array(RubricCriterionSchema).min(2).max(5),
    passCriteriaCount: z.number().int().min(1),
  }),
  z.object({
    kind: z.literal("builder"),
    instructions: z.string().max(1200),
    fields: z.array(BuilderFieldSchema).min(2).max(9),
    rubric: z.array(RubricCriterionSchema).min(2).max(5),
    passCriteriaCount: z.number().int().min(1),
  }),
]);
export type Gameplay = z.infer<typeof GameplaySchema>;

/* ------------------------------ Level container ----------------------------- */

export const LevelDefinitionSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: z.string(),                      // "business_model_t1"
    slug: z.string(),
    topic: TopicSchema,
    tier: TierSchema,
    title: z.string().max(80),
    subtitle: z.string().max(160),
    orderIndex: z.number().int().default(1), // ordering if a topic-tier has multiple levels
    xpReward: z.number().int().min(10).max(500),
    badgeId: z.string().optional(),
    estimatedMinutes: z.number().int(),
    caseTag: z.string().default("choconation"), // the running case this level draws on
    gameplay: GameplaySchema,
  })
  .superRefine((level, ctx) => {
    if (level.gameplay.kind === "narrative") {
      const metricIds = new Set(level.gameplay.metrics.map((m) => m.id));
      const nodeIds = new Set(level.gameplay.nodes.map((n) => n.id));
      if (!nodeIds.has(level.gameplay.startNodeId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `startNodeId "${level.gameplay.startNodeId}" not found in nodes` });
      }
      for (const node of level.gameplay.nodes) {
        for (const d of node.decisions) {
          for (const key of Object.keys(d.metricDeltas)) {
            if (!metricIds.has(key)) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: `decision ${d.id}: metricDeltas key "${key}" is not a defined metric` });
            }
          }
          if (d.nextNodeId !== null && !nodeIds.has(d.nextNodeId)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `decision ${d.id}: nextNodeId "${d.nextNodeId}" not found in nodes` });
          }
        }
      }
    }
    if (level.gameplay.kind === "sort_buckets") {
      const bucketIds = new Set(level.gameplay.buckets.map((b) => b.id));
      for (const item of level.gameplay.items) {
        if (!bucketIds.has(item.correctBucket)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `item ${item.id}: correctBucket "${item.correctBucket}" is not a defined bucket` });
        }
      }
    }
  });
export type LevelDefinition = z.infer<typeof LevelDefinitionSchema>;

/* --------------------------- AI response contracts -------------------------- */
// Every prompt in lib/ai must instruct GPT-5.6 to return ONLY JSON matching these.

// Narrative debrief after a decision
export const DebriefSchema = z.object({
  headline: z.string().max(90),
  whatHappened: z.string().max(600),
  whyItMatters: z.string().max(600),     // ONE underlying concept, teen-friendly
  realWorldNote: z.string().max(400),    // grounded in decision.realWorldParallel
  keyTerm: z.object({
    term: z.string().max(40),
    definition: z.string().max(200),
  }),
});
export type Debrief = z.infer<typeof DebriefSchema>;

// One AI turn in a roleplay
export const RoleplayTurnSchema = z.object({
  message: z.string().max(500),
  isClosing: z.boolean(),
  internalNote: z.string().max(200),     // persona's hidden reaction; feeds evaluator, never shown
});
export type RoleplayTurn = z.infer<typeof RoleplayTurnSchema>;

// AI scoring for roleplay and builder attempts
export const EvalResultSchema = z.object({
  criteria: z.array(z.object({
    id: z.string(),                      // must match a RubricCriterion id
    points: z.number().int().min(0),
    passed: z.boolean(),
    feedback: z.string().max(300),
  })),
  overallPassed: z.boolean(),
  strengths: z.array(z.string().max(200)).max(3),
  improvements: z.array(z.string().max(200)).max(3),
  encouragement: z.string().max(200),
});
export type EvalResult = z.infer<typeof EvalResultSchema>;

// Deterministic scoring output for sort_buckets and sequence (produced in code,
// same shape everywhere so the results screen is one component)
export const DeterministicResultSchema = z.object({
  correctCount: z.number().int(),
  totalCount: z.number().int(),
  percent: z.number().int(),
  passed: z.boolean(),
  perItem: z.array(z.object({
    id: z.string(),
    label: z.string(),
    correct: z.boolean(),
    explain: z.string(),                 // authored explain string from content
  })),
});
export type DeterministicResult = z.infer<typeof DeterministicResultSchema>;

/* --------------------------------- Progress --------------------------------- */

export const ProgressStatusSchema = z.enum(["locked", "unlocked", "in_progress", "completed"]);
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;

// Unlock rule (implemented in lib/game/unlock.ts):
// - ALL tier-1 levels are unlocked from the start (open-world roaming)
// - A topic's tier-2 level unlocks when that topic's tier-1 is completed