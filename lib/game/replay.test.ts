import assert from "node:assert/strict";
import test from "node:test";

import { hasCompletedLevel, resolveXpAward } from "./replay";

test("the first pass banks the level XP", () => {
  assert.deepEqual(resolveXpAward(false, 150), { isReplay: false, awardedXp: 150 });
});

test("a pass on an already-completed level is a replay worth no XP", () => {
  assert.deepEqual(resolveXpAward(true, 150), { isReplay: true, awardedXp: 0 });
});

test("only a completed row for the same level counts as completed", () => {
  const progress = [
    { level_id: "pitching_t1", status: "completed" },
    { level_id: "finance_t1", status: "in_progress" },
  ];
  assert.equal(hasCompletedLevel(progress, "pitching_t1"), true);
  assert.equal(hasCompletedLevel(progress, "finance_t1"), false);
  assert.equal(hasCompletedLevel(progress, "industry_t1"), false);
  assert.equal(hasCompletedLevel([], "pitching_t1"), false);
});
