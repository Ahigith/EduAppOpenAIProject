import assert from "node:assert/strict";
import test from "node:test";

import type { Persona, RubricCriterion } from "../schemas";
import { evaluateAttempt, generateRoleplayTurn } from "./client";

type MockResponse = { choices: [{ message: { content: string } }] };

function setMockResponses(outputs: string[], calls: unknown[]): void {
  let index = 0;
  (globalThis as typeof globalThis & { __youngEntrepreneursOpenAIClient?: unknown }).__youngEntrepreneursOpenAIClient = {
    chat: { completions: { create: async (request: unknown): Promise<MockResponse> => {
      calls.push(request);
      return { choices: [{ message: { content: outputs[index++] } }] };
    } } },
  };
}

const persona: Persona = { id: "meera", name: "Meera", role: "investor", traits: ["curious", "direct"], background: "A fictional investor.", objections: ["Who will buy it?"], maxTurns: 3, warmth: "friendly" };
const rubric: RubricCriterion[] = [
  { id: "clarity", label: "Clarity", description: "Explain the idea clearly.", maxPoints: 5, passThreshold: 3 },
  { id: "customer", label: "Customer", description: "Name a customer.", maxPoints: 5, passThreshold: 3 },
];

test("repairs an invalid roleplay response once", async () => {
  const calls: unknown[] = [];
  setMockResponses(["not json", JSON.stringify({ message: "Tell me who buys it.", isClosing: false, internalNote: "Needs a customer." })], calls);
  process.env.AI_MODEL = "test-model";
  const result = await generateRoleplayTurn(persona, 1, [{ role: "player", content: "I sell chocolate." }]);
  assert.equal(result.message, "Tell me who buys it.");
  assert.equal(calls.length, 2);
  assert.equal((calls[0] as { temperature: number }).temperature, 0.9);
});

test("returns the typed roleplay fallback after a failed repair", async () => {
  const calls: unknown[] = [];
  setMockResponses(["{", "still not json"], calls);
  process.env.AI_MODEL = "test-model";
  const result = await generateRoleplayTurn(persona, 1, []);
  assert.equal(result.isClosing, true);
  assert.equal(result.internalNote, "Technical fallback turn; do not penalize the player for this turn.");
  assert.equal(calls.length, 2);
});

test("clamps and recomputes inconsistent evaluator output", async () => {
  const calls: unknown[] = [];
  setMockResponses([JSON.stringify({
    criteria: [
      { id: "clarity", points: 99, passed: false, feedback: "Clear enough." },
      { id: "customer", points: 1, passed: true, feedback: "No customer named." },
    ],
    overallPassed: true, strengths: [], improvements: [], encouragement: "Try again with one customer.",
  })], calls);
  process.env.AI_MODEL = "test-model";
  const result = await evaluateAttempt(rubric, 2, "roleplay", { levelTitle: "Pitch ChocoNation", transcript: [{ role: "player", content: "I have an idea." }] });
  assert.notEqual(result, "pending");
  if (result !== "pending") {
    assert.deepEqual(result.criteria.map((criterion) => [criterion.id, criterion.points, criterion.passed]), [["clarity", 5, true], ["customer", 1, false]]);
    assert.equal(result.overallPassed, false);
  }
  assert.equal((calls[0] as { temperature: number }).temperature, 0.2);
});
