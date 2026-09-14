import test from "node:test";
import assert from "node:assert/strict";
import { topicEvidence, courseEvidence, readinessLabel } from "../domain/mastery-evidence.ts";
const now = "2026-09-14T12:00:00Z";
const concept = { id: "c", examImportance: 1, nextReviewAt: null };
const bank = ["a", "b", "c"].map(id => ({ id, conceptId: "c" }));
const attempts = outcomes => outcomes.map((outcome, i) => ({ id: String(i), conceptId: "c", promptId: "a", kind: "retrieval", outcome, createdAt: new Date(Date.UTC(2026, 8, i + 1)).toISOString() }));
test("shrinkage strengthens with repeated evidence, not coverage", () => {
  const one = topicEvidence(concept, bank, attempts(["success"]), now);
  const five = topicEvidence(concept, bank, attempts(Array(5).fill("success")), now);
  assert.equal(one.mastery, 2 / 3);
  assert.ok(five.mastery > .82 && five.mastery < .83);
  assert.equal(five.coverage, 1 / 3);
  assert.notEqual(five.readinessLabel, "Exam-ready");
});
test("recovery matters without erasing struggle", () => {
  const recovery = topicEvidence(concept, bank, attempts(["failure", "failure", "failure", "failure", "success"]), now);
  const relapse = topicEvidence(concept, bank, attempts(["success", "failure", "failure", "failure", "failure"]), now);
  assert.ok(recovery.mastery > relapse.mastery && recovery.mastery < .4);
});
test("duplicates, ratings and deleted questions cannot inflate evidence", () => {
  const [event] = attempts(["success"]);
  const result = topicEvidence(concept, bank, [event, event, { ...event, id: "rating", kind: "self_rating" }, { ...event, id: "old", promptId: "deleted" }], now);
  assert.equal(result.attemptCount, 1);
  assert.equal(result.coverage, 1 / 3);
  assert.ok(result.reasons.some(r => r.includes("unmapped")));
  assert.equal(topicEvidence(concept, [], [event], now).mastery, null);
});
test("thresholds require breadth and separated practice", () => {
  const e = { mastery: .8, coverage: .8, attemptCount: 5, attemptedQuestions: 3, availableQuestions: 3, practiceDays: 2 };
  assert.equal(readinessLabel(e), "Exam-ready");
  for (const patch of [{ coverage: .79 }, { attemptCount: 4 }, { attemptedQuestions: 2 }, { practiceDays: 1 }, { mastery: .79 }]) assert.equal(readinessLabel({ ...e, ...patch }), "Getting there");
  assert.equal(readinessLabel(e, true), "Getting there");
  assert.equal(readinessLabel({ ...e, mastery: .59 }), "Needs work");
  assert.equal(readinessLabel({ ...e, mastery: null, attemptCount: 0 }), "Not started");
});
test("exam weights keep coverage separate from mastery", () => {
  const result = courseEvidence([concept, { id: "other", examImportance: 3 }], bank, attempts(["success"]), now);
  assert.equal(result.coverage, 1 / 12);
  assert.equal(result.mastery, 2 / 3);
  assert.equal(result.incomplete, true);
});
test("question balancing resists repeated easy question gaming", () => {
  const events = [...attempts(Array(20).fill("success")), ...attempts(Array(5).fill("failure")).map(e => ({ ...e, id: `b${e.id}`, promptId: "b" }))];
  const result = topicEvidence(concept, bank, events, now);
  assert.ok(result.mastery < .6);
  assert.deepEqual(result, topicEvidence(concept, bank, events.toReversed(), now));
});
