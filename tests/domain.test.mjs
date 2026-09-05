import assert from "node:assert/strict";
import test from "node:test";
import { ALGORITHM_KIND, MASTERY_FAIL_MULTIPLIER } from "../domain/constants.ts";
import { applyRetrievalMastery, predictedRetention, recomputeConceptCache, withCachedState } from "../domain/learner-model.ts";
import { calculateLearningValue } from "../domain/learning-value.ts";
import { compareRoutes, generateRoute, rankLearningActions } from "../domain/routing-engine.ts";
import { createRetrievalEvent } from "../domain/session.ts";
import { createDemoSnapshot } from "../data/demo-seed.ts";
import { finishSession, loadAminaDemo, recordRetrieval, startSession } from "../lib/demo-store.ts";

const now = "2026-09-05T12:00:00.000Z";

test("algorithm is explicitly an interpretable MVP heuristic", () => {
  assert.equal(ALGORITHM_KIND, "kelus-mvp-heuristic-v1");
});

test("mastery rises after independent success and falls after failure", () => {
  const success = applyRetrievalMastery(0.5, "success", 0.4, 1);
  const failure = applyRetrievalMastery(0.5, "failure", 0.4, 1);
  assert.ok(success > 0.5 && success <= 1);
  assert.equal(failure, 0.5 * MASTERY_FAIL_MULTIPLIER);
});

test("retention decays deterministically with elapsed time", () => {
  const fresh = predictedRetention(0.8, 4, now, now);
  const stale = predictedRetention(0.8, 4, "2026-07-01T12:00:00.000Z", now);
  assert.ok(fresh > stale);
  assert.ok(stale >= 0 && stale <= 1);
});

test("fundamental principle: Elasticity outranks weaker low-value Game Theory", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const ranked = rankLearningActions({ concepts: snapshot.concepts, relationships: snapshot.relationships, events: snapshot.events, exam: snapshot.exams[0], nowIso: now });
  assert.ok(ranked.findIndex((row) => row.concept.id === "c-elasticity") < ranked.findIndex((row) => row.concept.id === "c-game-theory"));
  assert.equal(ranked[0].concept.id, "c-elasticity");
  assert.ok(ranked[0].value.reasons.includes("HIGH_EXAM_VALUE"));
});

test("prerequisite leverage raises expected learning value", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const elasticity = snapshot.concepts.find((concept) => concept.id === "c-elasticity");
  const withGraph = calculateLearningValue({ concept: elasticity, concepts: snapshot.concepts, relationships: snapshot.relationships, events: snapshot.events, exam: snapshot.exams[0], nowIso: now });
  const withoutGraph = calculateLearningValue({ concept: elasticity, concepts: snapshot.concepts, relationships: [], events: snapshot.events, exam: snapshot.exams[0], nowIso: now });
  assert.ok(withGraph.score > withoutGraph.score);
  assert.ok(withGraph.reasons.includes("PREREQUISITE_GAP"));
});

test("exam date, target and available time materially affect routing", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const concept = snapshot.concepts.find((item) => item.id === "c-elasticity");
  const base = { concept, concepts: snapshot.concepts, relationships: snapshot.relationships, events: snapshot.events, exam: snapshot.exams[0], nowIso: now };
  const normal = calculateLearningValue(base);
  const lowerTarget = calculateLearningValue({ ...base, exam: { ...base.exam, targetPercent: 60 } });
  const distantExam = calculateLearningValue({ ...base, exam: { ...base.exam, examDate: "2027-09-05T12:00:00.000Z" } });
  assert.ok(normal.score > lowerTarget.score);
  assert.ok(normal.score > distantExam.score);
  const shortRoute = generateRoute({ ...base, availableMinutes: 30 });
  const longRoute = generateRoute({ ...base, availableMinutes: 60 });
  assert.equal(shortRoute.availableMinutes, 30);
  assert.equal(longRoute.availableMinutes, 60);
});

test("time allocation spends the exact budget without equal splitting", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const route = generateRoute({ concepts: snapshot.concepts, relationships: snapshot.relationships, events: snapshot.events, exam: snapshot.exams[0], nowIso: now });
  assert.equal(route.allocations.reduce((sum, item) => sum + item.minutes, 0), 43);
  assert.equal(route.allocations.at(-1).conceptId, "mixed-retrieval");
  assert.notEqual(route.allocations[0].minutes, route.allocations[1].minutes);
  assert.ok(route.allocations[0].minutes <= 18);
});

test("real retrieval evidence updates the learner model and can materially reroute", () => {
  const snapshot = createDemoSnapshot(Date.parse(now));
  const elasticity = snapshot.concepts.find((concept) => concept.id === "c-elasticity");
  const previous = generateRoute({ concepts: snapshot.concepts, relationships: snapshot.relationships, events: snapshot.events, exam: snapshot.exams[0], nowIso: now });
  const event = createRetrievalEvent({ id: "new-evidence", userId: snapshot.profile.id, concept: elasticity, sessionId: "s1", promptId: "p-c-elasticity", responseText: "Substitutes make switching easier.", outcome: "success", createdAt: now });
  const events = [...snapshot.events, event];
  const concepts = snapshot.concepts.map((concept) => withCachedState(concept, recomputeConceptCache(concept, events, now)));
  const next = generateRoute({ concepts, relationships: snapshot.relationships, events, exam: snapshot.exams[0], nowIso: now });
  const change = compareRoutes(previous, next);
  assert.ok(concepts.find((concept) => concept.id === "c-elasticity").mastery > elasticity.mastery);
  assert.equal(change.meaningful, true);
  assert.equal(change.movedConceptId, "c-monetary-policy");
});

test("small route differences stay quiet", () => {
  const base = { generatedAt: now, availableMinutes: 43, allocations: [
    { conceptId: "a", minutes: 18, learningValue: 4, reasons: [] },
    { conceptId: "b", minutes: 12, learningValue: 3, reasons: [] },
    { conceptId: "c", minutes: 8, learningValue: 2, reasons: [] },
    { conceptId: "mixed-retrieval", minutes: 5, learningValue: 0, reasons: [] },
  ] };
  const slight = { ...base, allocations: base.allocations.map((item) => ({ ...item, learningValue: item.learningValue * 1.03 })) };
  assert.equal(compareRoutes(base, slight).meaningful, false);
});

test("complete product loop persists evidence, reroutes, and completes without expanding the session", () => {
  const loaded = loadAminaDemo(Date.parse(now));
  const before = loaded.snapshot.concepts;
  const { state: started, session } = startSession(loaded, loaded.snapshot.courses[0].id, loaded.snapshot.exams[0].id);
  const firstId = session.plannedConceptIds[0];
  const first = started.snapshot.concepts.find((concept) => concept.id === firstId);
  const next = recordRetrieval(started, {
    conceptId: firstId,
    sessionId: session.id,
    promptId: `p-${firstId}`,
    responseText: "A retrieved explanation",
    outcome: "success",
    responseTimeMs: 24_000,
    answerRevealed: true,
  });
  const updatedSession = next.snapshot.sessions.find((item) => item.id === session.id);
  const updated = next.snapshot.concepts.find((concept) => concept.id === firstId);
  assert.ok(updated.mastery > first.mastery);
  assert.equal(next.snapshot.events.at(-1).assistance, "answer_revealed");
  assert.equal(updatedSession.routeChanges.length, 1);
  assert.equal(updatedSession.plannedConceptIds.length, session.plannedConceptIds.length);
  const completed = finishSession(next, session.id, before);
  assert.equal(completed.snapshot.sessions.find((item) => item.id === session.id).status, "complete");
  assert.ok(completed.snapshot.sessions.find((item) => item.id === session.id).summary.readinessAfter >= 0);
});
