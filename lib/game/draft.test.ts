import assert from "node:assert/strict";
import test from "node:test";

import {
  draftFor,
  parseDraftPayload,
  parseLevelDraft,
  restoreBuilderSubmission,
  restoreNarrativePosition,
  restoreSequenceOrder,
  restoreSortAnswers,
} from "./draft";

test("a well-formed draft parses for every mechanic", () => {
  assert.deepEqual(parseLevelDraft({ mechanic: "sort_buckets", answers: { a: "revenue" } }), {
    mechanic: "sort_buckets",
    answers: { a: "revenue" },
  });
  assert.deepEqual(parseLevelDraft({ mechanic: "sequence", order: ["b", "a"] }), { mechanic: "sequence", order: ["b", "a"] });
  assert.deepEqual(parseLevelDraft({ mechanic: "builder", submission: { segment: "kirana owners" } }), {
    mechanic: "builder",
    submission: { segment: "kirana owners" },
  });
  assert.deepEqual(parseLevelDraft({ mechanic: "narrative", currentNodeId: "scene_2", metrics: { cash: 40 } }), {
    mechanic: "narrative",
    currentNodeId: "scene_2",
    metrics: { cash: 40 },
  });
  const roleplay = parseLevelDraft({ mechanic: "roleplay", messages: [{ role: "player", content: "Hi Meera" }], turnNumber: 1 });
  assert.deepEqual(roleplay, { mechanic: "roleplay", messages: [{ role: "player", content: "Hi Meera" }], turnNumber: 1, input: "" });
});

test("junk drafts are rejected instead of throwing", () => {
  assert.equal(parseLevelDraft(null), null);
  assert.equal(parseLevelDraft({ mechanic: "unknown_game" }), null);
  assert.equal(parseLevelDraft({ mechanic: "sequence", order: "not-an-array" }), null);
  assert.equal(parseLevelDraft({ mechanic: "roleplay", messages: [{ role: "narrator", content: "x" }], turnNumber: 1 }), null);
});

test("a stored payload round-trips and defaults to a first-pass draft", () => {
  const payload = parseDraftPayload({ kind: "level_draft", draft: { mechanic: "sequence", order: ["a"] } });
  assert.deepEqual(payload, { kind: "level_draft", draft: { mechanic: "sequence", order: ["a"] }, isReplay: false });
  assert.equal(parseDraftPayload({ kind: "roleplay", internalNotes: [] }), null, "another attempt kind is not a draft");
});

test("draftFor hands a client only its own mechanic", () => {
  const draft = parseLevelDraft({ mechanic: "builder", submission: { a: "x" } });
  assert.deepEqual(draftFor(draft, "builder"), { mechanic: "builder", submission: { a: "x" } });
  assert.equal(draftFor(draft, "sequence"), null);
  assert.equal(draftFor(null, "builder"), null);
});

test("restoring a sort board drops items and buckets the content file no longer has", () => {
  const answers = { keep: "revenue", gone_item: "revenue", bad_bucket: "deleted_bucket" };
  assert.deepEqual(restoreSortAnswers(answers, ["keep", "bad_bucket"], ["revenue"]), { keep: "revenue" });
});

test("restoring a sequence keeps the saved order and appends steps it never mentioned", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(restoreSequenceOrder(["c", "a"], steps).map((step) => step.id), ["c", "a", "b"]);
  assert.deepEqual(restoreSequenceOrder(["c", "c", "zzz", "b", "a"], steps).map((step) => step.id), ["c", "b", "a"]);
  assert.deepEqual(restoreSequenceOrder([], steps).map((step) => step.id), ["a", "b", "c"]);
});

test("restoring a builder canvas fills known fields and blanks new ones", () => {
  assert.deepEqual(restoreBuilderSubmission({ segment: "teens", removed: "old text" }, ["segment", "channels"]), {
    segment: "teens",
    channels: "",
  });
});

test("a narrative draft resumes only when its node still exists", () => {
  const start = { cash: 100, insight: 0 };
  assert.deepEqual(restoreNarrativePosition({ currentNodeId: "scene_2", metrics: { cash: 40 } }, ["scene_1", "scene_2"], start), {
    currentNodeId: "scene_2",
    metrics: { cash: 40, insight: 0 },
  });
  assert.equal(restoreNarrativePosition({ currentNodeId: "deleted", metrics: { cash: 40 } }, ["scene_1"], start), null);
  assert.equal(restoreNarrativePosition(null, ["scene_1"], start), null);
});
