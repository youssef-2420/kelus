import assert from "node:assert/strict";
import test from "node:test";
import { ankiCards, ankiFile } from "../domain/anki-export.ts";

const concepts = [{ id: "o", name: "Osmosis" }, { id: "e", name: "Enzymes" }];
const activities = [
  { conceptId: "o", learn: { explanation: "Osmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution. In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back. In a hypertonic solution the cell loses water and becomes plasmolysed.", keyPoints: [] }, retrieve: { prompt: "What is osmosis, according to your notes?", modelAnswer: "Osmosis is the movement of water across a partially permeable membrane." }, sourceReferences: [{ locator: "Page 2" }] },
  { conceptId: "e", learn: { explanation: "Enzymes are biological catalysts that speed up reactions without being used up. Each enzyme has an active site with a specific shape, so it only binds one substrate.", keyPoints: [] }, retrieve: { prompt: "What are enzymes, according to your notes?", modelAnswer: "Enzymes are biological catalysts." }, sourceReferences: [{ locator: "Page 3" }] },
];

test("every topic gives question cards plus its explain card, each quoting the notes and tagged by topic", () => {
  const cards = ankiCards(concepts, activities);
  assert.ok(cards.length >= 4);
  for (const name of ["Osmosis", "Enzymes"]) assert.ok(cards.some((card) => card.tags.includes(name) && card.tags.includes("explain")));
  assert.ok(cards.filter((card) => !card.tags.includes("explain")).every((card) => card.back.includes("“")));
});

test("the file is Anki's text import: headers, then exactly three tab-separated fields per line", () => {
  const file = ankiFile("BIO 101: Week 4", ankiCards(concepts, activities));
  const lines = file.trim().split("\n");
  assert.deepEqual(lines.slice(0, 5), ["#separator:tab", "#html:true", "#notetype:Basic", "#deck:Kelus::BIO 101 Week 4", "#tags column:3"]);
  for (const line of lines.slice(5)) assert.equal(line.split("\t").length, 3, line);
  assert.ok(!/<script/i.test(file));
});
