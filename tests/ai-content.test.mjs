import assert from "node:assert/strict";
import test from "node:test";
import { AI_LIMITS, buildPrompt, validateAiReply } from "../domain/ai-content.ts";

const input = {
  name: "Tax Incidence",
  locator: "Page 6",
  pageText: "Tax incidence describes how the burden of a tax is shared between buyers and sellers. The side of the market that is less elastic bears a larger share of the tax burden.",
  otherTopics: ["Total Revenue Test", "Cross-Price Elasticity"],
};

const good = {
  explanation: "Tax incidence is about who really pays a tax. The side that cannot easily switch pays more of it.",
  items: [
    { kind: "why", prompt: "Why does the less elastic side bear more of the tax?", modelAnswer: "It has fewer alternatives, so it cannot avoid the tax.", hint: "Think about who can walk away.", explanation: "The page says the less elastic side bears a larger share.", sourceQuote: "The side of the market that is less elastic bears a larger share of the tax burden." },
    { kind: "choice", prompt: "Who bears a larger share of the tax burden?", modelAnswer: "The less elastic side", hint: "Look at the second sentence.", explanation: "Stated on the page.", sourceQuote: "bears a larger share of the tax burden", choices: ["The more elastic side", "The less elastic side", "Always the seller", "Always the buyer"], correctIndex: 1 },
  ],
};

test("the prompt carries only the page, bounded, and tells the model not to use outside knowledge", () => {
  const { system, user } = buildPrompt({ ...input, pageText: "x".repeat(10_000) });
  assert.match(system, /ONLY the page text/);
  assert.match(system, /word-for-word/);
  assert.ok(JSON.parse(user).pageText.length <= AI_LIMITS.maxPageChars);
});

test("a well-formed reply is accepted and marked as AI-made", () => {
  const result = validateAiReply(JSON.stringify(good), input);
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every((item) => item.origin === "ai"));
  assert.equal(result.rejected.length, 0);
});

test("an item whose quote is not on the page is dropped, not shown", () => {
  const reply = { ...good, items: [...good.items, { kind: "recall", prompt: "What is the Laffer curve?", modelAnswer: "A curve of tax revenue.", sourceQuote: "The Laffer curve shows revenue falls at high rates." }] };
  const result = validateAiReply(JSON.stringify(reply), input);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.rejected.map((entry) => entry.reason), ["quote is not on the page"]);
});

test("malformed choices and bad indexes are rejected", () => {
  const bad = { explanation: "Fine.", items: [
    { kind: "choice", prompt: "Q1", modelAnswer: "A", sourceQuote: "bears a larger share of the tax burden", choices: ["A", "B"], correctIndex: 0 },
    { kind: "choice", prompt: "Q2", modelAnswer: "A", sourceQuote: "bears a larger share of the tax burden", choices: ["A", "B", "C", "D"], correctIndex: 9 },
    { kind: "choice", prompt: "Q3", modelAnswer: "A", sourceQuote: "bears a larger share of the tax burden", choices: ["A", "a", "C", "D"], correctIndex: 0 },
  ] };
  assert.equal(validateAiReply(JSON.stringify(bad), input), null);
});

test("junk, prose around the JSON, and empty replies are handled", () => {
  assert.equal(validateAiReply("not json at all", input), null);
  assert.equal(validateAiReply("{}", input), null);
  assert.equal(validateAiReply(`Here you go:\n${JSON.stringify(good)}\nHope it helps!`, input).items.length, 2);
});

test("a smaller request asks for fewer items, and never more than the limit", async () => {
  const { buildPrompt, AI_LIMITS } = await import("../domain/ai-content.ts");
  const input = { name: "T", locator: "Page 1", pageText: "x".repeat(80), otherTopics: [] };
  assert.match(JSON.parse(buildPrompt(input, { maxItems: 4 }).user).wanted, /Up to 4 items/);
  assert.match(JSON.parse(buildPrompt(input, { maxItems: 99 }).user).wanted, new RegExp(`Up to ${AI_LIMITS.maxItems} items`));
});
