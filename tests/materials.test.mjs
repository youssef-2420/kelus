import assert from "node:assert/strict";
import test from "node:test";
import { isPdfFile, materialTitle, parseMaterialUrl } from "../domain/materials.ts";
import { buildConfirmedMaterialModel, proposeConceptsFromPages } from "../domain/material-intelligence.ts";

test("material links are classified without inventing source data", () => {
  assert.equal(parseMaterialUrl("https://www.youtube.com/watch?v=abc").kind, "video");
  assert.equal(parseMaterialUrl("https://university.edu/week-3.pdf").kind, "pdf");
  assert.equal(parseMaterialUrl("https://university.edu/reading").kind, "link");
});

test("material URLs reject incomplete and unsafe protocols", () => {
  assert.throws(() => parseMaterialUrl("youtube.com/watch?v=abc"), /complete link/);
  assert.throws(() => parseMaterialUrl("file:///private/notes.pdf"), /Only http/);
});

test("PDF validation and titles are deterministic", () => {
  assert.equal(isPdfFile({ name: "lecture.PDF", type: "" }), true);
  assert.equal(isPdfFile({ name: "notes.txt", type: "text/plain" }), false);
  assert.equal(materialTitle("", "week_03-elasticity.pdf"), "week 03 elasticity");
  assert.equal(materialTitle(" My lecture ", "fallback.pdf"), "My lecture");
});

test("PDF pages produce reviewable concepts with exact page references", () => {
  const proposals = proposeConceptsFromPages({
    materialId: "material-1",
    sourceLabel: "Lecture 4",
    pages: [
      { pageNumber: 1, text: "Course Syllabus\nInstructor Email\nWeek 1: Supply and Demand\nMarkets coordinate buyers and sellers." },
      { pageNumber: 2, text: "2. Elasticity\nElasticity measures responsiveness to a change in price." },
    ],
  });
  assert.deepEqual(proposals.map((item) => item.name), ["Supply and Demand", "Elasticity"]);
  assert.deepEqual(proposals.map((item) => item.locator), ["Page 1", "Page 2"]);
  assert.match(proposals[1].sourceExcerpt, /responsiveness/);
});

test("confirmed material concepts become the existing learning model", () => {
  const proposals = proposeConceptsFromPages({
    materialId: "material-1",
    sourceLabel: "Lecture 4",
    pages: [{ pageNumber: 3, text: "Elasticity\nElasticity measures responsiveness to changes in price.\nMarket Structures\nMarket power distinguishes the structures." }],
  });
  const model = buildConfirmedMaterialModel({ proposals, courseId: "course-1", userId: "user-1", nowIso: "2026-09-05T12:00:00.000Z" });
  assert.equal(model.concepts.length, 2);
  assert.equal(model.prompts.length, 2);
  assert.equal(model.learningActivities.length, 2);
  assert.equal(model.relationships.length, 0, "PDF order must not fabricate prerequisites");
  assert.deepEqual(model.learningActivities[0].sourceReferences, [{ materialId: "material-1", label: "Lecture 4", locator: "Page 3" }]);
});
