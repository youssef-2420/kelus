import assert from "node:assert/strict";
import test from "node:test";
import { isPdfFile, materialTitle, parseMaterialUrl } from "../domain/materials.ts";

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
