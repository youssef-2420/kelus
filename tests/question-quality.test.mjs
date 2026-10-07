import assert from "node:assert/strict";
import test from "node:test";
import { allTopics } from "./fixtures/question-corpus.mjs";
import { buildPractice, quoteIsOnPage } from "../domain/content-engine.ts";
import { lintQuestion } from "../domain/question-lint.ts";
import { isDrillable } from "../domain/practice-check.ts";

const questions = [...allTopics()].map(({ name, text, siblings }) => {
  const input = { conceptId: name, name, excerpt: text, locator: "Section 1", siblingNames: siblings.filter((s) => s !== name) };
  return { topic: { input }, items: buildPractice(input) };
});

test("across a mixed corpus no question has a lint defect and every quote is on the page", () => {
  for (const { topic, items } of questions) {
    for (const item of items) {
      assert.deepEqual(lintQuestion(item), [], `${topic.input.name}: ${item.prompt}`);
      assert.ok(quoteIsOnPage(item.sourceQuote, topic.input.excerpt), `${topic.input.name}: quote not on page`);
    }
  }
});

test("the corpus gives understanding-level questions, not only gaps", () => {
  const all = questions.flatMap((q) => q.items);
  assert.ok(all.filter((item) => item.level === "understand").length >= 8);
  assert.ok(all.filter((item) => item.kind === "cloze").length / all.length < 0.8);
});

test("almost every topic can run a short check", () => {
  const short = questions.filter((q) => q.items.filter(isDrillable).length >= 2).length;
  assert.ok(short >= questions.length - 1, `${short} of ${questions.length}`);
});
