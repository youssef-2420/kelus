import assert from "node:assert/strict";
import test from "node:test";
import { documentTitle, proposeConceptsFromPages } from "../domain/material-intelligence.ts";

const page = {
  pageNumber: 1,
  text: [
    "BIO 101 · Week 4: Cells and transport",
    "Dr. A. Rahman · Lecture slides",
    "Active Transport",
    "Active transport moves substances against a concentration gradient. It needs energy from",
    "respiration in the form of ATP, because the carrier proteins must change shape. Diffusion,",
    "by contrast, is passive and needs",
    "no energy.",
    "Osmosis",
    "Osmosis is the movement of water across a partially permeable membrane from a dilute solution.",
  ].join("\n"),
};

test("a PDF paragraph wrapped across lines keeps its short last line, and every topic text ends on a whole sentence", () => {
  const proposals = proposeConceptsFromPages({ materialId: "m", sourceLabel: "Lecture", pages: [page], locatorLabel: "Page" });
  const active = proposals.find((proposal) => proposal.name === "Active Transport");
  assert.ok(active);
  assert.match(active.sourceExcerpt, /passive and needs\s+no energy\.$/);
  for (const proposal of proposals) assert.match(proposal.sourceExcerpt, /[.!?]["”)]?$/);
});

test("the document title names the course and is never a topic", () => {
  const proposals = proposeConceptsFromPages({ materialId: "m", sourceLabel: "Lecture", pages: [page], locatorLabel: "Page" });
  assert.ok(proposals.every((proposal) => !/BIO 101|Week 4/.test(proposal.name)));
  assert.equal(documentTitle([page]), "BIO 101 · Week 4: Cells and transport");
  assert.equal(documentTitle([{ pageNumber: 1, text: "Osmosis\nWater moves across membranes." }]), null);
});
