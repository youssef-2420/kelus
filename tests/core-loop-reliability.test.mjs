import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateDiagnosisResponse, evaluateLearningResponse } from "../domain/answer-evaluation.ts";
import { buildConfirmedMaterialModel, isSourceBackedProposal, proposeConceptsFromPages } from "../domain/material-intelligence.ts";
import { generateRoute } from "../domain/routing-engine.ts";
import { createLearnerSnapshot } from "../lib/setup.ts";
import { buildLayoutPage } from "../lib/pdf-extraction.ts";
import { reconcileMaterialRecords } from "../lib/material-sync.ts";
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

test("feedback names the missing source-backed criterion instead of generic encouragement", () => {
  const evaluation = evaluateLearningResponse({
    retrieveAnswer: "Water moves across the membrane.",
    applicationAnswer: "It changes when the environment changes.",
    retrieveModelAnswer: "Osmosis moves water across a selectively permeable membrane.",
    applicationModelAnswer: "Water moves along a concentration gradient.",
    assessment: { mode: "biology", criteria: [
      { id: "source-idea", label: "Names the membrane", terms: ["membrane"], minimumMatches: 1, appliesTo: "retrieve" },
      { id: "reasoning", label: "Explains the concentration gradient", terms: ["gradient"], minimumMatches: 1, appliesTo: "apply" },
    ] },
  });
  assert.equal(evaluation.outcome, "partial");
  assert.match(evaluation.explanation, /concentration gradient/i);
});

const subjectCases = [
  ["Biology", "Cellular Respiration", "Cellular respiration converts glucose into ATP through linked metabolic reactions.", /predict what changes|mechanism/i],
  ["Computer science", "Binary Search", "The binary search algorithm halves a sorted array until the target is found.", /input grows|required condition/i],
  ["History", "Industrial Revolution", "Industrialization changed labor, production, and migration during the nineteenth century.", /historical outcome|causal/i],
  ["Law", "Negligence", "Negligence liability requires duty, breach, causation, and damage under the legal doctrine.", /required element|qualified conclusion/i],
  ["Mathematics", "Bayes Theorem", "Bayes theorem calculates conditional probability from prior probability and evidence.", /condition.*not satisfied|concluded/i],
];

for (const [subject, name, explanation, expectedPrompt] of subjectCases) {
  test(`${subject} material produces a source-grounded subject-shaped activity`, () => {
    const pages = [{ pageNumber: 2, text: `1. ${name}\n${explanation}` }];
    const proposals = proposeConceptsFromPages({ materialId: `material-${subject}`, sourceLabel: `${subject} lecture`, pages });
    const model = buildConfirmedMaterialModel({ proposals, courseId: "course-1", userId: "user-1", nowIso, pages });
    assert.equal(model.concepts[0].name, name);
    assert.match(model.learningActivities[0].apply.prompt, expectedPrompt);
    assert.match(model.learningActivities[0].apply.prompt, new RegExp(name.split(" ")[0], "i"));
    assert.match(model.learningActivities[0].apply.prompt, /Do not claim a specific outcome the page does not establish/);
    assert.match(model.learningActivities[0].learn.explanation, new RegExp(name.split(" ")[0], "i"));
    assert.deepEqual(model.learningActivities[0].sourceReferences[0], {
      materialId: `material-${subject}`,
      label: `${subject} lecture`,
      locator: "Page 2",
    });
  });
}

test("layout-aware extraction recognizes a visually dominant heading and keeps its supporting paragraph", () => {
  const page = buildLayoutPage(4, [
    { str: "ATP Production", transform: [18, 0, 0, 18, 40, 720], width: 120, height: 18, hasEOL: true },
    { str: "Cells transfer energy through a linked sequence of reactions.", transform: [11, 0, 0, 11, 40, 690], width: 330, height: 11, hasEOL: true },
    { str: "The proton gradient drives ATP synthase across the membrane.", transform: [11, 0, 0, 11, 40, 674], width: 340, height: 11, hasEOL: true },
  ]);
  const [proposal] = proposeConceptsFromPages({ materialId: "layout-pdf", sourceLabel: "Cell lecture", pages: [page] });
  assert.equal(proposal.name, "ATP Production");
  assert.match(proposal.sourceExcerpt, /linked sequence.*proton gradient/i);
  assert.equal(proposal.locator, "Page 4");
});

test("structured evaluation accepts a valid paraphrase and rejects a contradictory keyword-rich answer", () => {
  const pages = [{ pageNumber: 3, text: "1. Enzyme Catalysis\nEnzymes lower activation energy and increase reaction rate without being consumed." }];
  const proposals = proposeConceptsFromPages({ materialId: "bio-rubric", sourceLabel: "Biology notes", pages });
  const model = buildConfirmedMaterialModel({ proposals, courseId: "course-1", userId: "user-1", nowIso, pages });
  const activity = model.learningActivities[0];
  const paraphrase = evaluateLearningResponse({
    retrieveAnswer: "The enzyme decreases the energy barrier, raising the reaction rate while the catalyst remains available.",
    applicationAnswer: "If the enzyme is blocked, activation energy rises and therefore the reaction slows because catalysis is reduced.",
    retrieveModelAnswer: activity.retrieve.modelAnswer,
    applicationModelAnswer: activity.apply.modelAnswer,
    assessment: activity.assessment,
  });
  const contradiction = evaluateLearningResponse({
    retrieveAnswer: "Enzymes do not lower activation energy and do not increase reaction rate.",
    applicationAnswer: "Because activation energy is unchanged, the enzyme causes no result in the reaction.",
    retrieveModelAnswer: activity.retrieve.modelAnswer,
    applicationModelAnswer: activity.apply.modelAnswer,
    assessment: activity.assessment,
  });
  assert.equal(paraphrase.outcome, "success");
  assert.equal(contradiction.outcome, "failure");
  assert.equal(contradiction.contradiction, true);
});

test("a delayed effect is not mistaken for a contradiction because it says not immediately", () => {
  const evaluation = evaluateLearningResponse({
    retrieveAnswer: "A higher interest rate makes borrowing more expensive, so households and firms spend less. That lowers aggregate demand and eases price pressure, usually after a delay.",
    applicationAnswer: "People and firms do not immediately refinance or change spending. Existing contracts and budgets delay the response, so lower demand reaches prices only after a lag.",
    retrieveModelAnswer: "It raises borrowing costs, restrains demand and investment, and can reduce upward pressure on prices.",
    applicationModelAnswer: "Loans, contracts, and spending plans adjust gradually, so tighter financial conditions pass through to demand and prices with a lag.",
  });
  assert.equal(evaluation.contradiction, false);
  assert.notEqual(evaluation.outcome, "failure");
});

test("a coherent economics paraphrase is not downgraded for different wording", () => {
  const result = evaluateLearningResponse({
    retrieveAnswer: "Higher rates make borrowing more expensive, so households and firms spend and invest less. Aggregate demand falls and inflation pressure eases, usually after a lag.",
    applicationAnswer: "Households and companies may have existing fixed-rate loans and contracts. New borrowing costs filter into spending decisions gradually; lower demand then affects prices with another delay.",
    retrieveModelAnswer: "It raises borrowing costs, restrains demand and investment, and can reduce upward pressure on prices.",
    applicationModelAnswer: "Loans, contracts, and spending plans adjust gradually, so tighter financial conditions pass through to demand and prices with a lag.",
  });
  assert.equal(result.outcome, "success");
});

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

test("signed-in material persistence is normalized, private, and wired to the learning shell", async () => {
  const [sql, provider, library, session] = await Promise.all([
    readFile(new URL("../database/005_normalized_course_materials.sql", import.meta.url), "utf8"),
    readFile(new URL("../components/LearnerProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/MaterialLibrary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/session/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /alter table course_materials enable row level security/i);
  assert.ok((sql.match(/auth\.uid\(\)/g) ?? []).length >= 4);
  assert.match(sql, /deleted_at/);
  assert.match(sql, /course_materials_user_updated_idx/);
  assert.match(provider, /initializeMaterialSync/);
  assert.match(library, /uploadMaterialPdf/);
  assert.match(session, /readMaterialPdf/);
});

test("material reconciliation keeps the newest edit and honors newer deletion tombstones", () => {
  const base = {
    id: "material-1", courseId: "course-1", kind: "pdf", storage: "local", title: "Old title",
    sourceUrl: null, fileName: "notes.pdf", mimeType: "application/pdf", sizeBytes: 1200,
    role: "notes", processingStatus: "ready", addedAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  };
  const remoteNewer = {
    user_id: "user-1", id: base.id, course_id: base.courseId, kind: base.kind, storage: base.storage,
    title: "Renamed remotely", source_url: null, file_name: base.fileName, mime_type: base.mimeType,
    size_bytes: base.sizeBytes, role: base.role, processing_status: base.processingStatus,
    added_at: base.addedAt, updated_at: "2026-09-02T10:00:00.000Z", deleted_at: null,
  };
  const merged = reconcileMaterialRecords([base], [remoteNewer]);
  assert.equal(merged.materials[0].title, "Renamed remotely");
  assert.deepEqual(merged.pushLocal, []);

  const deleted = reconcileMaterialRecords(
    [{ ...base, updatedAt: "2026-09-03T10:00:00.000Z" }],
    [{ ...remoteNewer, updated_at: "2026-09-04T10:00:00.000Z", deleted_at: "2026-09-04T10:00:00.000Z" }],
  );
  assert.deepEqual(deleted.materials, []);
  assert.deepEqual(deleted.removeLocalIds, [base.id]);
});

test("touching text fragments such as ligatures stay one word, real gaps stay spaces", () => {
  const page = buildLayoutPage(1, [
    { str: "Of", transform: [12, 0, 0, 12, 40, 700], width: 14, height: 12 },
    { str: "fi", transform: [12, 0, 0, 12, 54, 700], width: 6, height: 12 },
    { str: "ce hours", transform: [12, 0, 0, 12, 60, 700], width: 48, height: 12 },
    { str: "Tuesday", transform: [12, 0, 0, 12, 118, 700], width: 40, height: 12, hasEOL: true },
  ]);
  assert.equal(page.text, "Office hours Tuesday");
});

test("a title page with course logistics is not proposed as study topics", () => {
  const pages = [
    { pageNumber: 1, text: "ECON 201 Principles of\n\nMicroeconomics\n\nInstructor: Dr. Rivera. Office hours: Tuesday 2pm in room 314. Email: rivera@example.edu" },
    { pageNumber: 2, text: "Price Elasticity of Demand\n\nPrice elasticity of demand measures how strongly the quantity demanded responds to a change in price." },
  ];
  const names = proposeConceptsFromPages({ materialId: "title-page", sourceLabel: "Econ", pages }).filter(isSourceBackedProposal).map((item) => item.name);
  assert.deepEqual(names, ["Price Elasticity of Demand"]);
});

test("claims that start with 'The <topic> ...' get a specific recall question", () => {
  const pages = [{ pageNumber: 3, text: "Total Revenue Test\n\nThe total revenue test links elasticity to a firm's revenue. When demand is elastic, a price increase lowers total revenue." }];
  const proposals = proposeConceptsFromPages({ materialId: "trt", sourceLabel: "Econ", pages });
  const model = buildConfirmedMaterialModel({ proposals, courseId: "c", userId: "u", nowIso, pages });
  assert.equal(model.prompts[0].promptText, "What does Total Revenue Test link, according to your notes?");
});

test("a recall check accepts a correct definition without asking for reasoning or transfer", () => {
  const pages = [{ pageNumber: 2, text: "Price Elasticity of Demand\n\nPrice elasticity of demand measures how strongly the quantity demanded responds to a change in price. Demand is elastic when the absolute value is greater than one." }];
  const proposals = proposeConceptsFromPages({ materialId: "recall-only", sourceLabel: "Econ", pages });
  const model = buildConfirmedMaterialModel({ proposals, courseId: "c", userId: "u", nowIso, pages });
  const activity = model.learningActivities[0];
  const answer = "It measures how strongly the quantity demanded responds to a change in price.";
  const diagnosis = evaluateDiagnosisResponse({ answer, modelAnswer: activity.retrieve.modelAnswer, assessment: activity.assessment });
  assert.equal(diagnosis.outcome, "success");
  assert.deepEqual(diagnosis.criteria.map((criterion) => criterion.id), ["source-idea"]);
  assert.doesNotMatch(diagnosis.explanation, /reasoned application/);

  const vague = evaluateDiagnosisResponse({ answer: "It is about prices and stuff in the market.", modelAnswer: activity.retrieve.modelAnswer, assessment: activity.assessment });
  assert.notEqual(vague.outcome, "success");

  // The session still asks for an application: a definition alone is not a strong session answer.
  const session = evaluateLearningResponse({ retrieveAnswer: answer, applicationAnswer: answer, retrieveModelAnswer: activity.retrieve.modelAnswer, applicationModelAnswer: activity.apply.modelAnswer, assessment: activity.assessment });
  assert.notEqual(session.outcome, "success");
});
