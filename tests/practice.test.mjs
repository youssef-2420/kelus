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
