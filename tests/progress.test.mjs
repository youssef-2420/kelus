import assert from "node:assert/strict";
import test from "node:test";
import { masteryAt, progressHeadline, progressSummary } from "../domain/progress.ts";

const NOW = new Date(2026, 9, 10, 12, 0).getTime();
const ago = (days, hour = 12) => new Date(2026, 9, 10 - days, hour).toISOString();
const concept = (id, mastery, importance = 1) => ({ id, name: id.toUpperCase(), mastery, examImportance: importance, courseId: "c" });
const ev = (conceptId, daysAgo, before, after, outcome = "success", kind = "retrieval") => ({ conceptId, kind, outcome, createdAt: ago(daysAgo), masteryBefore: before, masteryAfter: after });

test("mastery at a past moment is where the topic stood then, not where it is now", () => {
  const a = concept("a", 0.8);
  const events = [ev("a", 9, 0.2, 0.4), ev("a", 3, 0.4, 0.8)];
  assert.equal(masteryAt(a, events, NOW), 0.8);
  assert.equal(masteryAt(a, events, NOW - 5 * 86_400_000), 0.4);
  assert.equal(masteryAt(a, events, NOW - 20 * 86_400_000), 0.2); // before anything: where it started
  assert.equal(masteryAt(concept("b", 0.3), [], NOW), 0.3); // never answered: the starting estimate
});

test("with too few answers it says it is too early and does not claim a trend", () => {
  const concepts = [concept("a", 0.4), concept("b", 0.2)];
  const s = progressSummary({ concepts, events: [ev("a", 1, 0.2, 0.4), ev("a", 1, 0.4, 0.5)], nowMs: NOW, daysToExam: 9 });
  assert.equal(s.enough, false);
  assert.equal(s.answersNeeded, 4);
  assert.match(progressHeadline(s), /^Too early to say\. Answer 4 more topic checks/);
});

test("enough answers across enough topics shows the change in weighted points and which topics moved", () => {
  const concepts = [concept("a", 0.8, 2), concept("b", 0.3, 1), concept("c", 0.1, 1)];
  const events = [
    ev("a", 6, 0.4, 0.5), ev("a", 5, 0.5, 0.6), ev("a", 2, 0.6, 0.8),
    ev("b", 3, 0.1, 0.3), ev("b", 2, 0.3, 0.3, "failure"), ev("b", 1, 0.3, 0.3, "failure"),
  ];
  const s = progressSummary({ concepts, events, nowMs: NOW, daysToExam: 5 });
  assert.equal(s.enough, true);
  assert.ok(s.points > 0);
  assert.deepEqual(s.stronger.map((t) => t.id), ["a", "b"]); // largest gain first
  assert.deepEqual(s.notStarted.map((t) => t.id), ["c"]);
  assert.ok(s.needsPass.some((t) => t.id === "b")); // low mastery and last answer failed
  assert.equal(s.series.length, 14);
  assert.match(progressHeadline(s), /^Up \d+ points this week/);
});

test("a slip is reported as a slip, and a flat week is not dressed up", () => {
  const concepts = [concept("a", 0.3), concept("b", 0.3)];
  const slipping = [ev("a", 6, 0.6, 0.6), ev("a", 5, 0.6, 0.6), ev("b", 6, 0.6, 0.6), ev("b", 5, 0.6, 0.6), ev("a", 1, 0.6, 0.3, "failure"), ev("b", 1, 0.6, 0.3, "failure")];
  const down = progressSummary({ concepts, events: slipping, nowMs: NOW, daysToExam: 5 });
  assert.match(progressHeadline(down), /^Down \d+ points/);
  const flat = [ev("a", 6, 0.3, 0.3), ev("a", 5, 0.3, 0.3), ev("a", 4, 0.3, 0.3), ev("b", 6, 0.3, 0.3), ev("b", 3, 0.3, 0.3), ev("b", 2, 0.3, 0.3)];
  assert.match(progressHeadline(progressSummary({ concepts, events: flat, nowMs: NOW, daysToExam: 5 })), /^About the same/);
});

test("the pace line counts topics not yet strong against the days left", () => {
  const concepts = [concept("a", 0.9), concept("b", 0.2), concept("c", 0.2), concept("d", 0.5)];
  const s = progressSummary({ concepts, events: [], nowMs: NOW, daysToExam: 3 });
  assert.equal(s.topicsLeft, 3);
  assert.equal(s.perDay, 1);
  assert.equal(progressSummary({ concepts, events: [], nowMs: NOW, daysToExam: 0 }).perDay, 3); // exam today: no divide by zero
});

test("the week's counts only include this week's answers", () => {
  const concepts = [concept("a", 0.5), concept("b", 0.5)];
  const s = progressSummary({ concepts, events: [ev("a", 1, 0.3, 0.4), ev("a", 2, 0.4, 0.5), ev("b", 2, 0.3, 0.5), ev("b", 12, 0.1, 0.3)], nowMs: NOW, daysToExam: 5 });
  assert.equal(s.answers, 3);
  assert.equal(s.daysStudied, 2);
  assert.equal(s.topicsPractised, 2);
});

test("a topic that went up is not also listed as needing a pass, unless your last answer missed", () => {
  const concepts = [concept("a", 0.3), concept("b", 0.3)];
  const events = [
    ev("a", 6, 0, 0.1), ev("a", 4, 0.1, 0.2), ev("a", 1, 0.2, 0.3, "partial"), // climbing, still low
    ev("b", 6, 0, 0.1), ev("b", 4, 0.1, 0.2), ev("b", 1, 0.2, 0.3, "failure"), // climbing, but last answer missed
  ];
  const s = progressSummary({ concepts, events, nowMs: NOW, daysToExam: 5 });
  assert.deepEqual(s.stronger.map((t) => t.id).sort(), ["a", "b"]);
  assert.deepEqual(s.needsPass.map((t) => t.id), ["b"]);
});
