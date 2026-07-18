import assert from "node:assert/strict";
import test from "node:test";

import type { Gameplay } from "../schemas";
import { scoreSequence, scoreSortBuckets, shuffleSteps } from "./scoring";

const sortGameplay: Extract<Gameplay, { kind: "sort_buckets" }> = {
  kind: "sort_buckets",
  scenario: "Sort ChocoNation's business model parts.",
  buckets: [
    { id: "customer", label: "Customer" },
    { id: "cost", label: "Cost" },
  ],
  items: [
    { id: "students", label: "Students", correctBucket: "customer", explain: "Students are the audience." },
    { id: "cocoa", label: "Cocoa", correctBucket: "cost", explain: "Cocoa is an input cost." },
    { id: "delivery", label: "Delivery", correctBucket: "cost", explain: "Delivery costs money." },
    { id: "parents", label: "Parents", correctBucket: "customer", explain: "Parents can buy the product." },
    { id: "wrappers", label: "Wrappers", correctBucket: "cost", explain: "Wrappers are a packaging cost." },
  ],
  passPercent: 70,
};

const sequenceGameplay: Extract<Gameplay, { kind: "sequence" }> = {
  kind: "sequence",
  scenario: "Put ChocoNation's product steps in order.",
  steps: [
    { id: "idea", label: "Idea", explain: "Start with an idea." },
    { id: "test", label: "Test", explain: "Test before producing." },
    { id: "make", label: "Make", explain: "Make the product." },
    { id: "sell", label: "Sell", explain: "Then sell it." },
  ],
  passPercent: 75,
};

test("scoreSortBuckets returns a passing perfect result with authored feedback", () => {
  const result = scoreSortBuckets(sortGameplay, {
    students: "customer",
    cocoa: "cost",
    delivery: "cost",
    parents: "customer",
    wrappers: "cost",
  });

  assert.equal(result.correctCount, 5);
  assert.equal(result.percent, 100);
  assert.equal(result.passed, true);
  assert.deepEqual(result.perItem[1], {
    id: "cocoa",
    label: "Cocoa",
    correct: true,
    explain: "Cocoa is an input cost.",
  });
});

test("scoreSortBuckets marks missing and incorrect answers wrong", () => {
  const result = scoreSortBuckets(sortGameplay, { students: "customer", cocoa: "customer" });

  assert.equal(result.correctCount, 1);
  assert.equal(result.totalCount, 5);
  assert.equal(result.percent, 20);
  assert.equal(result.passed, false);
  assert.equal(result.perItem[1].correct, false);
  assert.equal(result.perItem[2].correct, false);
});

test("scoreSequence handles perfect, partial, and extra player entries", () => {
  const perfect = scoreSequence(sequenceGameplay, ["idea", "test", "make", "sell"]);
  const partial = scoreSequence(sequenceGameplay, ["idea", "make", "test", "sell", "ignored"]);

  assert.equal(perfect.percent, 100);
  assert.equal(perfect.passed, true);
  assert.equal(partial.correctCount, 2);
  assert.equal(partial.percent, 50);
  assert.equal(partial.passed, false);
  assert.equal(partial.perItem[1].explain, "Test before producing.");
});

test("shuffleSteps is deterministic, preserves every step, and never returns the authored order", () => {
  const first = shuffleSteps(sequenceGameplay.steps, 42);
  const second = shuffleSteps(sequenceGameplay.steps, 42);

  assert.deepEqual(first, second);
  assert.deepEqual([...first].sort((a, b) => a.id.localeCompare(b.id)), [...sequenceGameplay.steps].sort((a, b) => a.id.localeCompare(b.id)));
  assert.notDeepEqual(first, sequenceGameplay.steps);
});

test("shuffleSteps rejects an order that cannot be changed", () => {
  const onlyStep: typeof sequenceGameplay.steps = [{ id: "idea", label: "Idea", explain: "Start here." }];

  assert.throws(() => shuffleSteps(onlyStep, 1), RangeError);
});
