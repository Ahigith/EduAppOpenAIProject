import assert from "node:assert/strict";
import test from "node:test";

import { createBuilderPostHandler } from "./route";
import type { EvalResult, LevelDefinition } from "../../../lib/schemas";

const level = {
  id: "builder_t1", slug: "build-it", title: "Build it", xpReward: 120,
  gameplay: {
    kind: "builder",
    fields: [{ id: "customer", label: "Customer", prompt: "Who buys?", maxChars: 80 }, { id: "value", label: "Value", prompt: "Why buy?", maxChars: 80 }],
    rubric: [{ id: "clarity", label: "Clarity", description: "Be clear.", maxPoints: 5, passThreshold: 3 }], passCriteriaCount: 1,
  },
} as LevelDefinition;

const passedEvaluation: EvalResult = {
  criteria: [{ id: "clarity", points: 4, passed: true, feedback: "Clear customer value." }], overallPassed: true,
  strengths: ["Specific customer."], improvements: [], encouragement: "Keep testing your idea.",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function handler(overrides: Partial<Parameters<typeof createBuilderPostHandler>[0]> = {}) {
  return createBuilderPostHandler({
    getUserId: async () => "user-1", getLevel: () => level, evaluate: async () => passedEvaluation, getProgress: async () => [],
    recordAttempt: async () => ({ id: "attempt-1" } as never), upsertProgress: async () => ({ level_id: level.id } as never), ...overrides,
  });
}

test("builder submission is evaluated, saved, and awards XP after a pass", async () => {
  const evaluations: unknown[][] = []; const attempts: unknown[] = []; const progressUpdates: unknown[] = [];
  const post = handler({
    evaluate: async (...args) => { evaluations.push(args); return passedEvaluation; },
    recordAttempt: async (input) => { attempts.push(input); return { id: "attempt-1" } as never; },
    upsertProgress: async (input) => { progressUpdates.push(input); return { level_id: level.id } as never; },
  });
  const response = await post(request({ slug: level.slug, submission: { customer: " School students ", value: "Affordable snack for breaks" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { evaluation: passedEvaluation, awardedXp: 120, isReplay: false });
  assert.deepEqual(evaluations[0]?.slice(0, 3), [level.gameplay.rubric, 1, "builder"]);
  assert.deepEqual((evaluations[0]?.[3] as { builderSubmission: unknown }).builderSubmission, { customer: "School students", value: "Affordable snack for breaks" });
  assert.equal(attempts.length, 1);
  assert.deepEqual(progressUpdates, [{ userId: "user-1", levelId: level.id, status: "completed", xpEarned: 120 }]);
});

test("builder rejects missing, unknown, empty, and oversized fields before evaluation", async () => {
  let evaluations = 0; const post = handler({ evaluate: async () => { evaluations += 1; return passedEvaluation; } });
  for (const submission of [{ customer: "Students" }, { customer: "Students", value: "Affordable", extra: "Nope" }, { customer: " ", value: "Affordable" }, { customer: "Students", value: "x".repeat(81) }]) {
    assert.equal((await post(request({ slug: level.slug, submission }))).status, 400);
  }
  assert.equal(evaluations, 0);
});

test("pending builder evaluation is saved without awarding XP or completing progress", async () => {
  const attempts: unknown[] = []; let progressUpdates = 0;
  const post = handler({
    evaluate: async () => "pending", recordAttempt: async (input) => { attempts.push(input); return { id: "attempt-1" } as never; },
    upsertProgress: async () => { progressUpdates += 1; return { level_id: level.id } as never; },
  });
  const response = await post(request({ slug: level.slug, submission: { customer: "Students", value: "Affordable snack" } }));
  assert.deepEqual(await response.json(), { evaluation: "pending", awardedXp: 0, isReplay: false });
  assert.deepEqual((attempts[0] as { score: unknown }).score, { status: "pending" });
  assert.equal(progressUpdates, 0);
});

test("replaying an already-completed builder level awards no XP and never rewrites progress", async () => {
  let progressUpdates = 0;
  const post = handler({
    getProgress: async () => [{ level_id: level.id, status: "completed", xp_earned: 120 }] as never,
    upsertProgress: async () => { progressUpdates += 1; return { level_id: level.id } as never; },
  });
  const response = await post(request({ slug: level.slug, submission: { customer: "Students", value: "Affordable snack" } }));
  assert.deepEqual(await response.json(), { evaluation: passedEvaluation, awardedXp: 0, isReplay: true });
  assert.equal(progressUpdates, 0);
});
