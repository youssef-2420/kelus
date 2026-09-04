import assert from "node:assert/strict";
import test from "node:test";
import { createLearnerSnapshot, normalizeTopics } from "../lib/setup.ts";

const now = Date.parse("2026-09-04T12:00:00.000Z");

test("topic setup trims, deduplicates, and preserves the learner's order", () => {
  assert.deepEqual(normalizeTopics(["  Framing ", "Loss   aversion", "framing", ""]), ["Framing", "Loss aversion"]);
});

test("first-run setup creates one coherent course without invented history", () => {
  const snapshot = createLearnerSnapshot({
    displayName: " Maya ",
    courseName: " Behavioral economics ",
    examName: "Final",
    examDate: "2026-10-18",
    topics: ["Framing", "Loss aversion", "Prospect theory"],
    familiarity: "new",
  }, now);

  assert.equal(snapshot.profile.displayName, "Maya");
  assert.equal(snapshot.courses[0].name, "Behavioral economics");
  assert.equal(snapshot.exams[0].courseId, snapshot.courses[0].id);
  assert.equal(snapshot.concepts.length, 3);
  assert.equal(snapshot.events.length, 0);
  assert.ok(snapshot.concepts.every((concept) => concept.retrievalAttempts === 0 && concept.mastery === 0));
  assert.ok(snapshot.prompts.every((prompt) => prompt.modelAnswer.includes("course material")));
});

test("self-reported familiarity is recorded as seed evidence, not retrieval history", () => {
  const snapshot = createLearnerSnapshot({
    displayName: "Maya",
    courseName: "Economics",
    examName: "Final",
    examDate: "2026-10-18",
    topics: ["Framing", "Loss aversion"],
    familiarity: "familiar",
  }, now);
  assert.equal(snapshot.events.length, 2);
  assert.ok(snapshot.events.every((event) => event.kind === "seed_rating" && event.sessionId === null));
  assert.ok(snapshot.concepts.every((concept) => concept.retrievalAttempts === 0));
});

test("setup rejects incomplete or past-dated plans", () => {
  const base = { displayName: "Maya", courseName: "Economics", examName: "Final", topics: ["One", "Two"], familiarity: "new" };
  assert.throws(() => createLearnerSnapshot({ ...base, examDate: "2026-09-01" }, now), /future/);
  assert.throws(() => createLearnerSnapshot({ ...base, examDate: "2026-10-18", topics: ["One"] }, now), /two topics/);
});
