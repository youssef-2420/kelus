import assert from "node:assert/strict";
import test from "node:test";
import { buildPractice, quoteIsOnPage, splitSentences, teachingFacts } from "../domain/content-engine.ts";
import { checkPracticeAnswer, isDrillable } from "../domain/practice-check.ts";

const page = "The total revenue test links elasticity to a firm's revenue. When demand is elastic, a price increase lowers total revenue because quantity falls proportionally more than price rises. When demand is inelastic, a price increase raises total revenue. Unit elastic demand means total revenue is unchanged by a small price change.";
const siblings = ["Total Revenue Test", "Cross-Price Elasticity", "Tax Incidence", "Income Elasticity of Demand"];

test("a topic page yields several varied questions, each quoting the page", () => {
  const items = buildPractice({ conceptId: "c1", name: "Total Revenue Test", excerpt: page, locator: "Page 3", siblingNames: siblings });
  assert.ok(items.length >= 4);
  assert.deepEqual([...new Set(items.map((item) => item.kind))].sort(), ["choice", "cloze", "recall", "scenario", "why"]);
  for (const item of items) {
    assert.ok(quoteIsOnPage(item.sourceQuote, page), `quote must be on the page: ${item.sourceQuote}`);
    assert.equal(item.origin, "offline");
  }
});

test("the multiple choice answer is among the options and wrong options are the course's other topics", () => {
  const choice = buildPractice({ conceptId: "c1", name: "Total Revenue Test", excerpt: page, locator: "Page 3", siblingNames: siblings }).find((item) => item.kind === "choice");
  assert.ok(choice);
  assert.equal(choice.choices[choice.correctIndex], "Total Revenue Test");
  assert.ok(choice.choices.every((option) => siblings.includes(option)));
  assert.doesNotMatch(choice.prompt, /Total Revenue Test/);
});

test("a gap is one word taken from the page, and the answer is checked fairly", () => {
  const cloze = buildPractice({ conceptId: "c1", name: "Total Revenue Test", excerpt: page, locator: "Page 3", siblingNames: siblings }).find((item) => item.kind === "cloze");
  assert.ok(cloze && isDrillable(cloze));
  assert.ok(page.includes(cloze.modelAnswer));
  assert.equal(checkPracticeAnswer(cloze, cloze.modelAnswer), true);
  assert.equal(checkPracticeAnswer(cloze, cloze.modelAnswer.toUpperCase()), true);
  assert.equal(checkPracticeAnswer(cloze, "unrelated"), false);
  assert.equal(checkPracticeAnswer(cloze, ""), false);
});

test("teaching facts are the page's own sentences, not study tips", () => {
  const facts = teachingFacts("Total Revenue Test", page);
  assert.ok(facts.length >= 3);
  assert.ok(facts.every((fact) => page.includes(fact)));
});

test("a quote that is not on the page is rejected", () => {
  assert.equal(quoteIsOnPage("Demand always rises when prices fall in every market.", page), false);
  assert.equal(quoteIsOnPage("short", page), false);
  assert.equal(splitSentences("Too short. This sentence is long enough to keep around.").length, 1);
});

test("a topic with no other topics gets no multiple choice instead of a bad one", () => {
  const items = buildPractice({ conceptId: "c2", name: "Total Revenue Test", excerpt: page, locator: "Page 3", siblingNames: ["Total Revenue Test"] });
  assert.ok(items.every((item) => item.kind !== "choice"));
});

const bullets = "• Phospholipid bilayer: two layers of lipids with hydrophilic heads and hydrophobic tails\n• Selectively permeable: lets some molecules through, blocks others\n• Fluid mosaic model: proteins float in the lipid layer\n• Cholesterol keeps the membrane stable at different temperatures";

test("bullets become separate facts with the marker removed", async () => {
  const { units } = await import("../domain/content-engine.ts");
  const result = units(bullets);
  assert.equal(result.length, 4);
  assert.ok(result.every((line) => !/^[•-]/.test(line)));
});

test("a line the PDF wrapped is read as one idea", async () => {
  const { units } = await import("../domain/content-engine.ts");
  const result = units("Osmosis: the movement of water across a semipermeable membrane from low solute\nconcentration to high solute concentration.\nIsotonic - no net movement of water");
  assert.equal(result.length, 2);
  assert.match(result[0], /low solute concentration to high/);
});

test("term and meaning lines make a matching question using the page's other terms", () => {
  const items = buildPractice({ conceptId: "m1", name: "Cell Membrane", excerpt: bullets, locator: "Page 2", siblingNames: ["Cell Membrane", "Osmosis"] });
  const match = items.find((item) => item.kind === "choice" && /Which one matches/.test(item.prompt));
  assert.ok(match);
  assert.ok(match.choices.every((choice) => /^(Phospholipid bilayer|Selectively permeable|Fluid mosaic model)$/.test(choice)));
  assert.ok(quoteIsOnPage(match.sourceQuote, bullets));
});

test("a gap in a term line hides the meaning, not the term", () => {
  const items = buildPractice({ conceptId: "m1", name: "Cell Membrane", excerpt: bullets, locator: "Page 2", siblingNames: [] });
  const cloze = items.find((item) => item.kind === "cloze");
  assert.ok(cloze);
  assert.doesNotMatch(cloze.prompt, /_____[:]/);
  assert.ok(/(?:Phospholipid bilayer|Selectively permeable|Fluid mosaic model|Cholesterol)/.test(cloze.prompt));
});

test("numbered steps ask what comes next, without offering the step in the question", () => {
  const steps = "1. Glycolysis occurs in the cytoplasm and splits glucose into pyruvate\n2. The Krebs cycle takes place in the mitochondrial matrix and releases carbon dioxide\n3. The electron transport chain makes most of the ATP using a proton gradient";
  const items = buildPractice({ conceptId: "s1", name: "Steps of Cellular Respiration", excerpt: steps, locator: "Page 4", siblingNames: [] });
  const next = items.find((item) => /comes right after/.test(item.prompt));
  assert.ok(next);
  const shown = next.prompt.match(/“(.+)”/)[1];
  assert.ok(!next.choices.includes(shown));
  assert.ok(next.choices.includes(next.modelAnswer));
  assert.equal(next.choices[next.correctIndex], next.modelAnswer);
});
