import assert from "node:assert/strict";
import test from "node:test";
import { createLearnerSnapshot } from "../lib/setup.ts";

const now = Date.parse("2026-09-05T12:00:00.000Z");

test("destination setup keeps the student's real course and waits for material-derived concepts", () => {
  const snapshot = createLearnerSnapshot({ courseName: "Molecular Biology", examName: "Cell Biology Final", examDate: "2026-09-28", targetPercent: 85, availableMinutes: 45 }, now);
  assert.equal(snapshot.courses[0].name, "Molecular Biology");
  assert.equal(snapshot.exams[0].target, "Cell Biology Final");
  assert.equal(snapshot.exams[0].targetPercent, 85);
  assert.equal(snapshot.exams[0].availableMinutes, 45);
  assert.equal(snapshot.concepts.length, 0);
  assert.equal(snapshot.events.length, 0);
  assert.equal(snapshot.relationships.length, 0);
  assert.equal(snapshot.prompts.length, 0);
  assert.equal(snapshot.learningActivities.length, 0);
});

test("every onboarding field affects or validates routing state", () => {
  const base = { courseName: "Organic Chemistry", examName: "Final", examDate: "2026-09-28", targetPercent: 85, availableMinutes: 45 };
  assert.throws(() => createLearnerSnapshot({ ...base, courseName: "" }, now), /which course/);
  assert.throws(() => createLearnerSnapshot({ ...base, examName: "" }, now), /working toward/);
  assert.throws(() => createLearnerSnapshot({ ...base, examDate: "2026-09-01" }, now), /future/);
  assert.throws(() => createLearnerSnapshot({ ...base, targetPercent: 120 }, now), /target/);
  assert.throws(() => createLearnerSnapshot({ ...base, availableMinutes: 20 }, now), /study time/);
});
