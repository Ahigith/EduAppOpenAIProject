import assert from "node:assert/strict";
import test from "node:test";

import type { Persona } from "../schemas";
import { generateRoleplayAttemptTurn } from "./roleplay-flow";

type MockResponse = { choices: [{ message: { content: string } }] };

function setMockResponse(output: object, calls: unknown[]): void {
  (globalThis as typeof globalThis & { __youngEntrepreneursOpenAIClient?: unknown }).__youngEntrepreneursOpenAIClient = {
    chat: { completions: { create: async (request: unknown): Promise<MockResponse> => {
      calls.push(request);
      return { choices: [{ message: { content: JSON.stringify(output) } }] };
    } } },
  };
}

const persona: Persona = {
  id: "meera", name: "Meera", role: "investor", traits: ["curious", "direct"],
  background: "A fictional investor.", objections: ["Who will buy it?"], maxTurns: 3,
  warmth: "friendly",
};

test("evaluates when the configured maximum turn is reached", async () => {
  const calls: unknown[] = [];
  setMockResponse({ message: "One last question.", isClosing: false, internalNote: "Awaiting answer." }, calls);
  process.env.AI_MODEL = "test-model";

  const result = await generateRoleplayAttemptTurn({
    persona,
    turnNumber: 3,
    transcript: [{ role: "player", content: "Students will buy it at school fairs." }],
  });

  assert.equal(calls.length, 1);
  assert.equal(result.shouldEvaluate, true);
  assert.equal(result.personaTurn.isClosing, false);
});

test("evaluates immediately when the mocked persona closes early", async () => {
  const calls: unknown[] = [];
  setMockResponse({ message: "I am ready to decide.", isClosing: true, internalNote: "Strong pitch." }, calls);
  process.env.AI_MODEL = "test-model";

  const result = await generateRoleplayAttemptTurn({
    persona,
    turnNumber: 1,
    transcript: [{ role: "player", content: "ChocoNation makes affordable festival gift boxes." }],
  });

  assert.equal(calls.length, 1);
  assert.equal(result.shouldEvaluate, true);
  assert.equal(result.personaTurn.isClosing, true);
});
