import assert from "node:assert/strict";
import test from "node:test";
import { proposeConceptsFromPages } from "../domain/material-intelligence.ts";
import { completeDiagnosis, confirmMaterialConcepts, recordRetrieval, removeMaterialLearning, startSession } from "../lib/demo-store.ts";
import { createLearnerSnapshot } from "../lib/setup.ts";

const nowIso = "2026-09-07T12:00:00.000Z";

test("adding a second source keeps the first topic, its evidence, and the open session", () => {
  const snapshot = createLearnerSnapshot({
    courseName: "Cell Biology",
    examName: "Final",
    examDate: "2026-10-01",
    targetPercent: 85,
    availableMinutes: 45,
  }, Date.parse(nowIso));
  const initial = { snapshot, nowIso, onboardingCompleted: true, diagnosisCompleted: false };
  const firstPages = [{ pageNumber: 1, text: "1. Cell Membranes\nCell membranes regulate transport between the cell and its environment." }];
  const firstProposals = proposeConceptsFromPages({ materialId: "first-pdf", sourceLabel: "First lecture", pages: firstPages });
  const first = confirmMaterialConcepts(initial, firstProposals, firstPages);
  const firstId = first.snapshot.concepts.find((concept) => concept.name === "Cell Membranes").id;
  const diagnosed = completeDiagnosis(first, { ratings: { [firstId]: "weak" }, retrievals: [] });
  const { state: studying, session } = startSession(diagnosed, snapshot.courses[0].id, snapshot.exams[0].id);
  const answered = recordRetrieval(studying, {
    conceptId: firstId,
    sessionId: session.id,
    promptId: studying.snapshot.prompts.find((prompt) => prompt.conceptId === firstId).id,
    responseText: "I need another attempt.",
    outcome: "failure",
  });

  const secondPages = [{ pageNumber: 2, text: "2. Osmosis\nOsmosis depends on cell membranes and moves water across a selectively permeable membrane." }];
  const secondProposals = proposeConceptsFromPages({ materialId: "second-pdf", sourceLabel: "Second lecture", pages: secondPages });
  const after = confirmMaterialConcepts(answered, secondProposals, secondPages);
  assert.deepEqual(after.snapshot.concepts.map((concept) => concept.name).sort(), ["Cell Membranes", "Osmosis"]);
  assert.ok(after.snapshot.events.some((event) => event.sessionId === session.id && event.conceptId === firstId));
  assert.ok(after.snapshot.sessions.some((item) => item.id === session.id && item.status === "in_progress"));
  assert.equal(after.diagnosisCompleted, true);
  assert.ok(after.snapshot.concepts.find((concept) => concept.id === firstId).retrievalAttempts >= 1);
});

test("removing a PDF removes source-backed topics and abandons an affected open session", () => {
  const snapshot = createLearnerSnapshot({ courseName: "Biology", examName: "Final", examDate: "2026-10-01", targetPercent: 85, availableMinutes: 45 }, Date.parse(nowIso));
  const initial = { snapshot, nowIso, onboardingCompleted: true, diagnosisCompleted: false };
  const pages = [{ pageNumber: 1, text: "1. Cell Membranes\nCell membranes regulate transport between the cell and its environment." }];
  const proposals = proposeConceptsFromPages({ materialId: "first-pdf", sourceLabel: "First lecture", pages });
  const confirmed = confirmMaterialConcepts(initial, proposals, pages);
  const conceptId = confirmed.snapshot.concepts[0].id;
  const diagnosed = completeDiagnosis(confirmed, { ratings: { [conceptId]: "weak" }, retrievals: [] });
  const { state: studying, session } = startSession(diagnosed, snapshot.courses[0].id, snapshot.exams[0].id);
  const removed = removeMaterialLearning(studying, "first-pdf");
  assert.equal(removed.snapshot.concepts.length, 0);
  assert.equal(removed.snapshot.prompts.length, 0);
  assert.equal(removed.snapshot.learningActivities.length, 0);
  assert.equal(removed.snapshot.sessions.find((item) => item.id === session.id).status, "abandoned");
  assert.equal(removed.diagnosisCompleted, false);
  assert.ok(removed.snapshot.events.some((event) => event.conceptId === conceptId));
});
