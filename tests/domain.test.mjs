import assert from "node:assert/strict";
import test from "node:test";
import { ALGORITHM_KIND, MASTERY_FAIL_MULTIPLIER } from "../domain/constants.ts";
import { advanceDemoClock, isDemoClockEnabled } from "../domain/demo-clock.ts";
import {
  applyRetrievalMastery,
  deriveStatus,
  predictedRetention,
  recomputeConceptCache,
} from "../domain/learner-model.ts";
import { attentionCount, planTodaySession, rankConcepts } from "../domain/scheduler.ts";
import { createRetrievalEvent, sessionSummary } from "../domain/session.ts";
import { createDemoSnapshot } from "../data/demo-seed.ts";

const now = "2026-09-03T12:00:00.000Z";

test("algorithm is explicitly an MVP heuristic", () => {
  assert.equal(ALGORITHM_KIND, "kelus-mvp-heuristic-v1");
});

test("success raises mastery in [0,1]; failure multiplies it", () => {
  const up = applyRetrievalMastery(0.5, "success", 0.4, 1);
  const down = applyRetrievalMastery(0.5, "failure", 0.4, 1);
  assert.ok(up > 0.5 && up <= 1);
  assert.equal(down, 0.5 * MASTERY_FAIL_MULTIPLIER);
});

test("retention decays with time since last success", () => {
  const fresh = predictedRetention(0.8, 4, "2026-09-03T12:00:00.000Z", now);
  const stale = predictedRetention(0.8, 4, "2026-08-01T12:00:00.000Z", now);
  assert.ok(fresh > stale);
  assert.ok(stale >= 0 && stale <= 1);
});

test("unseen concepts are not learned", () => {
  assert.equal(deriveStatus(0, 0, 0), "not_learned");
});

test("recompute treats events as history and caches derived state", () => {
  const concept = { id: "c1", difficulty: 0.5 };
  const events = [
    { id: "e0", userId: "u", conceptId: "c1", sessionId: null, kind: "seed_rating", outcome: "partial", promptId: null, responseText: null, masteryBefore: 0, masteryAfter: 0.5, createdAt: "2026-08-01T12:00:00.000Z" },
    { id: "e1", userId: "u", conceptId: "c1", sessionId: "s", kind: "retrieval", outcome: "success", promptId: "p", responseText: "ok", masteryBefore: 0.5, masteryAfter: 0.6, createdAt: "2026-08-20T12:00:00.000Z" },
  ];
  const cache = recomputeConceptCache(concept, events, now);
  assert.ok(cache.mastery > 0.5);
  assert.equal(cache.retrievalAttempts, 1);
  assert.equal(cache.successfulRetrievals, 1);
  assert.ok(cache.predictedRetention <= cache.mastery);
  assert.ok(cache.nextReviewAt);
});

test("scheduler mixes weak, fading, and new concepts and respects unmet prerequisites", () => {
  const exam = { id: "ex", courseId: "co", userId: "u", target: "Midterm", examDate: "2026-09-21T12:00:00.000Z", isActive: true };
  const concepts = [
    { id: "prereq", courseId: "co", userId: "u", name: "Prereq", importance: 0.8, difficulty: 0.4, mastery: 0.2, confidence: 0.2, predictedRetention: 0.15, lastReviewedAt: now, nextReviewAt: now, retrievalAttempts: 2, successfulRetrievals: 0, failedRetrievals: 2, createdAt: now, updatedAt: now },
    { id: "advanced", courseId: "co", userId: "u", name: "Advanced", importance: 0.9, difficulty: 0.6, mastery: 0.3, confidence: 0.2, predictedRetention: 0.2, lastReviewedAt: now, nextReviewAt: now, retrievalAttempts: 2, successfulRetrievals: 0, failedRetrievals: 2, createdAt: now, updatedAt: now },
    { id: "fade", courseId: "co", userId: "u", name: "Fade", importance: 0.7, difficulty: 0.4, mastery: 0.7, confidence: 0.7, predictedRetention: 0.45, lastReviewedAt: now, nextReviewAt: now, retrievalAttempts: 4, successfulRetrievals: 3, failedRetrievals: 1, createdAt: now, updatedAt: now },
    { id: "new", courseId: "co", userId: "u", name: "New", importance: 0.6, difficulty: 0.4, mastery: 0, confidence: 0, predictedRetention: 0, lastReviewedAt: null, nextReviewAt: null, retrievalAttempts: 0, successfulRetrievals: 0, failedRetrievals: 0, createdAt: now, updatedAt: now },
  ];
  const relationships = [{ id: "r", fromId: "prereq", toId: "advanced", kind: "prerequisite" }];
  const ranked = rankConcepts(concepts, exam, relationships, now);
  const prereq = ranked.find((row) => row.concept.id === "prereq");
  const advanced = ranked.find((row) => row.concept.id === "advanced");
  assert.ok((prereq?.priority ?? 0) > (advanced?.priority ?? 0));
  const plan = planTodaySession(concepts, exam, relationships, now);
  assert.ok(plan.concepts.length <= 7);
  assert.ok(plan.weak <= 3);
  assert.ok(plan.nextNew <= 2);
  assert.equal(attentionCount(concepts) >= 3, true);
});

test("session retrieval event is immutable history and updates cached mastery", () => {
  const concept = {
    id: "c1", courseId: "co", userId: "u", name: "Pricing", importance: 0.8, difficulty: 0.5,
    mastery: 0.4, confidence: 0.3, predictedRetention: 0.35, lastReviewedAt: now, nextReviewAt: now,
    retrievalAttempts: 1, successfulRetrievals: 0, failedRetrievals: 1, createdAt: now, updatedAt: now,
  };
  const event = createRetrievalEvent({
    id: "e2", userId: "u", concept, sessionId: "s1", promptId: "p1", responseText: "value and stance", outcome: "success", createdAt: now,
  });
  assert.equal(event.kind, "retrieval");
  assert.equal(event.masteryBefore, 0.4);
  assert.ok(event.masteryAfter > 0.4);
  const seed = { id: "e0", userId: "u", conceptId: "c1", sessionId: null, kind: "seed_rating", outcome: "partial", promptId: null, responseText: null, masteryBefore: 0, masteryAfter: 0.4, createdAt: "2026-08-01T12:00:00.000Z" };
  const after = recomputeConceptCache(concept, [seed, event], now);
  assert.ok(after.mastery > 0.4);
  const summary = sessionSummary([concept], [{ ...concept, ...after }]);
  assert.ok(summary.masteryGained > 0);
  assert.ok(summary.strengthenedIds.includes("c1"));
});

test("demo seed is immediately useful and demo clock is blocked in production", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  assert.equal(snapshot.profile.displayName, "Amina");
  assert.equal(snapshot.exams.length, 1);
  assert.equal(snapshot.exams[0].courseId, snapshot.courses[0].id);
  assert.equal(snapshot.exams.filter((exam) => exam.isActive).length, 1);
  assert.ok(snapshot.concepts.length >= 6);
  assert.ok(snapshot.prompts.length === snapshot.concepts.length);
  const original = process.env.NODE_ENV;
  assert.equal(isDemoClockEnabled(), original === "development");
  process.env.NODE_ENV = "production";
  assert.equal(isDemoClockEnabled(), false);
  assert.throws(() => advanceDemoClock(now, 1), /not available/);
  process.env.NODE_ENV = original;
});
