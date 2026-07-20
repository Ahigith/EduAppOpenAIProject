import assert from "node:assert/strict";
import test from "node:test";

import type { Persona, RubricCriterion } from "../schemas";
import { evaluateAttempt, generateRoleplayTurn } from "./client";

const persona: Persona = { id: "meera", name: "Meera", role: "investor", traits: ["curious", "direct"], background: "A fictional investor.", objections: ["Who will buy it?"], maxTurns: 3, warmth: "friendly" };
const rubric: RubricCriterion[] = [
  { id: "clarity", label: "Clarity", description: "Explain the idea clearly.", maxPoints: 5, passThreshold: 3 },
  { id: "customer", label: "Customer", description: "Name a customer.", maxPoints: 5, passThreshold: 3 },
];

test("returns the same scripted Meera response for the same turn and message", async () => {
  const history = [{ role: "player" as const, content: "Students struggle to find affordable festival gifts." }];
  const first = await generateRoleplayTurn(persona, 1, history);
  const second = await generateRoleplayTurn(persona, 1, history);
  assert.deepEqual(first, second);
  assert.match(first.message, /Who exactly feels it most/);
});

test("closes the scripted conversation at the configured maximum turn", async () => {
  const result = await generateRoleplayTurn(persona, 3, [{ role: "player", content: "Students pay ₹100 for each gift box." }]);
  assert.equal(result.isClosing, true);
  assert.match(result.message, /how a sale could work/);
});

test("evaluates the same pitch consistently without an API response", async () => {
  const payload = { levelTitle: "Pitch ChocoNation", transcript: [{ role: "player" as const, content: "ChocoNation sells ₹100 gift boxes to students at school fairs." }] };
  const first = await evaluateAttempt(rubric, 2, "roleplay", payload);
  const second = await evaluateAttempt(rubric, 2, "roleplay", payload);
  assert.deepEqual(first, second);
  assert.notEqual(first, "pending");
  if (first !== "pending") {
    assert.deepEqual(first.criteria.map((criterion) => [criterion.id, criterion.points, criterion.passed]), [["clarity", 5, true], ["customer", 5, true]]);
    assert.equal(first.overallPassed, true);
  }
});
