import assert from "node:assert/strict";
import test from "node:test";

import type { Persona } from "../schemas";
import { generateRoleplayAttemptTurn } from "./roleplay-flow";

const persona: Persona = {
  id: "meera", name: "Meera", role: "investor", traits: ["curious", "direct"],
  background: "A fictional investor.", objections: ["Who will buy it?"], maxTurns: 3,
  warmth: "friendly",
};

test("evaluates when the configured maximum turn is reached", async () => {
  const result = await generateRoleplayAttemptTurn({
    persona,
    turnNumber: 3,
    transcript: [{ role: "player", content: "Students will buy it at school fairs." }],
  });

  assert.equal(result.shouldEvaluate, true);
  assert.equal(result.personaTurn.isClosing, true);
});

test("keeps the scripted conversation open before the maximum turn", async () => {
  const result = await generateRoleplayAttemptTurn({
    persona,
    turnNumber: 1,
    transcript: [{ role: "player", content: "ChocoNation makes affordable festival gift boxes." }],
  });

  assert.equal(result.shouldEvaluate, false);
  assert.equal(result.personaTurn.isClosing, false);
});
