import assert from "node:assert/strict";
import test from "node:test";

import { roleplayRestartState, roleplayXpAward } from "./roleplay-restart";

test("restart after a failed roleplay starts an empty attempt", () => {
  assert.deepEqual(roleplayRestartState(4), { turnNumber: 0, maxTurns: 4, messages: [] });
});

test("restart after a passed roleplay never awards the level XP twice", () => {
  assert.equal(roleplayXpAward(false, 150), 150);
  assert.equal(roleplayXpAward(true, 150), 0);
});
