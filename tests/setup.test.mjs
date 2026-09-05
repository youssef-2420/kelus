import assert from "node:assert/strict";
import test from "node:test";
import { createLearnerSnapshot } from "../lib/setup.ts";

const now = Date.parse("2026-09-05T12:00:00.000Z");

test("destination setup creates the supported Microeconomics graph with no invented learner evidence", () => {
  const snapshot = createLearnerSnapshot({ examName: "Microeconomics Final", examDate: "2026-09-28", targetPercent: 85, availableMinutes: 45 }, now);
  assert.equal(snapshot.exams[0].target, "Microeconomics Final");
  assert.equal(snapshot.exams[0].targetPercent, 85);
  assert.equal(snapshot.exams[0].availableMinutes, 45);
  assert.equal(snapshot.concepts.length, 7);
  assert.equal(snapshot.events.length, 0);
  assert.ok(snapshot.concepts.every((concept) => concept.mastery === 0 && concept.confidence === 0));
  assert.ok(snapshot.relationships.some((relationship) => relationship.kind === "prerequisite"));
});

test("every onboarding field affects or validates routing state", () => {
  const base = { examName: "Final", examDate: "2026-09-28", targetPercent: 85, availableMinutes: 45 };
  assert.throws(() => createLearnerSnapshot({ ...base, examName: "" }, now), /working toward/);
  assert.throws(() => createLearnerSnapshot({ ...base, examDate: "2026-09-01" }, now), /future/);
  assert.throws(() => createLearnerSnapshot({ ...base, targetPercent: 120 }, now), /target/);
  assert.throws(() => createLearnerSnapshot({ ...base, availableMinutes: 20 }, now), /study time/);
});
