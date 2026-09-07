import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateDiagnosisResponse, evaluateLearningResponse } from "../domain/answer-evaluation.ts";
import { buildConfirmedMaterialModel, proposeConceptsFromPages } from "../domain/material-intelligence.ts";
import { generateRoute } from "../domain/routing-engine.ts";
import { createLearnerSnapshot } from "../lib/setup.ts";
import { completeDiagnosis, recordRetrieval, startSession } from "../lib/demo-store.ts";

const nowIso = "2026-09-07T12:00:00.000Z";

test("answer evaluation is deterministic and cannot be promoted by self-rating", () => {
  const expected = "Enzymes lower activation energy and increase reaction rate without being consumed.";
  const strong = evaluateLearningResponse({
    retrieveAnswer: "Enzymes lower activation energy, increasing reaction rate without being consumed.",
    applicationAnswer: "Adding the enzyme lowers activation energy, so this reaction proceeds faster without consuming the enzyme.",
    retrieveModelAnswer: expected,
    applicationModelAnswer: `A sound answer uses this mechanism: ${expected}`,
  });
  const partial = evaluateLearningResponse({
    retrieveAnswer: "Enzymes lower activation energy.",
    applicationAnswer: "The enzyme changes activation energy in the new reaction.",
    retrieveModelAnswer: expected,
    applicationModelAnswer: `A sound answer uses this mechanism: ${expected}`,
  });
  const failure = evaluateDiagnosisResponse({ answer: "I understand this perfectly", modelAnswer: expected });

  assert.equal(strong.outcome, "success");
  assert.equal(partial.outcome, "partial");
  assert.equal(failure.outcome, "failure");
  assert.deepEqual(strong, evaluateLearningResponse({
    retrieveAnswer: "Enzymes lower activation energy, increasing reaction rate without being consumed.",
    applicationAnswer: "Adding the enzyme lowers activation energy, so this reaction proceeds faster without consuming the enzyme.",
    retrieveModelAnswer: expected,
    applicationModelAnswer: `A sound answer uses this mechanism: ${expected}`,
  }));
});

const subjectCases = [
  ["Biology", "Cellular Respiration", "Cellular respiration converts glucose into ATP through linked metabolic reactions.", /predict what changes|mechanism/i],
  ["Computer science", "Binary Search", "The binary search algorithm halves a sorted array until the target is found.", /new input|system state/i],
  ["History", "Industrial Revolution", "Industrialization changed labor, production, and migration during the nineteenth century.", /historical outcome|causal/i],
  ["Law", "Negligence", "Negligence liability requires duty, breach, causation, and damage under the legal doctrine.", /fact pattern|decisive fact/i],
  ["Mathematics", "Bayes Theorem", "Bayes theorem calculates conditional probability from prior probability and evidence.", /show the steps|new case/i],
];

for (const [subject, name, explanation, expectedPrompt] of subjectCases) {
  test(`${subject} material produces a source-grounded subject-shaped activity`, () => {
    const pages = [{ pageNumber: 2, text: `1. ${name}\n${explanation}` }];
    const proposals = proposeConceptsFromPages({ materialId: `material-${subject}`, sourceLabel: `${subject} lecture`, pages });
    const model = buildConfirmedMaterialModel({ proposals, courseId: "course-1", userId: "user-1", nowIso, pages });
    assert.equal(model.concepts[0].name, name);
    assert.match(model.learningActivities[0].apply.prompt, expectedPrompt);
    assert.match(model.learningActivities[0].learn.explanation, new RegExp(name.split(" ")[0], "i"));
    assert.deepEqual(model.learningActivities[0].sourceReferences[0], {
      materialId: `material-${subject}`,
      label: `${subject} lecture`,
      locator: "Page 2",
    });
  });
}

test("one student journey reaches a source-backed route and updates it from evaluated evidence", () => {
  const base = createLearnerSnapshot({
    courseName: "Molecular Biology",
    examName: "Cell Biology Final",
    examDate: "2026-09-20",
    targetPercent: 85,
    availableMinutes: 45,
  }, Date.parse(nowIso));
  const pages = [
    { pageNumber: 1, text: "1. Cell Membranes\nCell membranes regulate transport between the cell and its environment." },
    { pageNumber: 2, text: "2. Osmosis\nOsmosis depends on Cell Membranes and moves water across a selectively permeable membrane." },
  ];
  const proposals = proposeConceptsFromPages({ materialId: "material-bio", sourceLabel: "Biology slides", pages });
  const model = buildConfirmedMaterialModel({ proposals, courseId: base.courses[0].id, userId: base.profile.id, nowIso, pages });
  const state = {
    snapshot: { ...base, ...model, events: [], sessions: [] },
    nowIso,
    onboardingCompleted: true,
    diagnosisCompleted: false,
  };
  const diagnosed = completeDiagnosis(state, {
    ratings: Object.fromEntries(model.concepts.map((concept) => [concept.id, "weak"])),
    retrievals: [],
  });
  const route = generateRoute({
    concepts: diagnosed.snapshot.concepts,
    relationships: diagnosed.snapshot.relationships,
    events: diagnosed.snapshot.events,
    exam: diagnosed.snapshot.exams[0],
    nowIso,
  });
  assert.ok(route.allocations.length >= 1);
  const { state: started, session } = startSession(diagnosed, diagnosed.snapshot.courses[0].id, diagnosed.snapshot.exams[0].id);
  const firstId = session.plannedConceptIds[0];
  const firstActivity = started.snapshot.learningActivities.find((item) => item.conceptId === firstId);
  const evaluation = evaluateLearningResponse({
    retrieveAnswer: "I do not remember the mechanism.",
    applicationAnswer: "I cannot apply it yet.",
    retrieveModelAnswer: firstActivity.retrieve.modelAnswer,
    applicationModelAnswer: firstActivity.apply.modelAnswer,
  });
  assert.equal(evaluation.outcome, "failure");
  const updated = recordRetrieval(started, {
    conceptId: firstId,
    sessionId: session.id,
    promptId: `p-${firstId}`,
    responseText: "I do not remember the mechanism.",
    outcome: evaluation.outcome,
  });
  assert.equal(updated.snapshot.events.at(-1).outcome, "failure");
  assert.ok(updated.snapshot.concepts.find((item) => item.id === firstId).mastery < started.snapshot.concepts.find((item) => item.id === firstId).mastery);
});

test("signed-in material persistence is private and wired to the learning shell", async () => {
  const [sql, provider, library, session] = await Promise.all([
    readFile(new URL("../database/004_user_material_state.sql", import.meta.url), "utf8"),
    readFile(new URL("../components/LearnerProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/MaterialLibrary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/session/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /alter table material_states enable row level security/i);
  assert.ok((sql.match(/auth\.uid\(\)/g) ?? []).length >= 8);
  assert.match(sql, /public, file_size_limit/);
  assert.match(provider, /initializeMaterialSync/);
  assert.match(library, /uploadMaterialPdf/);
  assert.match(session, /readMaterialPdf/);
});
