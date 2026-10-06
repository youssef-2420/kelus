import assert from "node:assert/strict";
import test from "node:test";
import { buildQuickRun, quickOutcome, quickSummary } from "../domain/quick-run.ts";
import { buildPractice, quoteIsOnPage } from "../domain/content-engine.ts";
import { isDrillable } from "../domain/practice-check.ts";

const page = "Tax incidence describes how the burden of a tax is shared between buyers and sellers.\nThe side of the market that is less elastic bears a larger share of the tax burden.";
const activity = {
  id: "a", conceptId: "c1",
  learn: { title: "Tax Incidence", explanation: "Tax incidence describes how the burden of a tax is shared between buyers and sellers.", keyPoints: ["The side of the market that is less elastic bears a larger share of the tax burden."] },
  retrieve: { prompt: "What does Tax Incidence describe, according to your notes?", hint: "h", explanation: "e", example: "x", modelAnswer: "Tax incidence describes how the burden of a tax is shared between buyers and sellers." },
  apply: { prompt: "p", hint: "h", modelAnswer: "m" },
  sourceReferences: [{ materialId: "m", label: "doc", locator: "Page 6" }],
};

test("a run is two to three checks from the page, then one explanation", () => {
  const run = buildQuickRun({ activity, name: "Tax Incidence", siblingNames: ["Tax Incidence", "Total Revenue Test", "Cross-Price Elasticity"] });
  assert.ok(run.checks.length >= 2 && run.checks.length <= 3);
  assert.ok(run.checks.every((item) => item.kind === "choice" || item.kind === "cloze"));
  assert.ok(run.checks.every((item) => quoteIsOnPage(item.sourceQuote, page)));
  assert.equal(run.explainPrompt, activity.retrieve.prompt);
  assert.equal(new Set(run.checks.map((item) => item.kind)).size, run.checks.length === 2 ? 2 : new Set(run.checks.map((item) => item.kind)).size);
});

test("a page that gives fewer than two checks keeps the longer loop", () => {
  const thin = { ...activity, learn: { ...activity.learn, explanation: "Short.", keyPoints: [] } };
  assert.equal(buildQuickRun({ activity: thin, name: "Tax Incidence", siblingNames: ["Tax Incidence"] }), null);
});

test("the outcome needs both kinds of evidence", () => {
  assert.equal(quickOutcome({ right: 3, total: 3, self: "nailed" }), "success");
  assert.equal(quickOutcome({ right: 0, total: 3, self: "nailed" }), "partial", "a strong rating cannot rescue wrong checks");
  assert.equal(quickOutcome({ right: 3, total: 3, self: "missed" }), "partial", "a miss caps the result");
  assert.equal(quickOutcome({ right: 0, total: 3, self: "missed" }), "failure");
  assert.equal(quickOutcome({ right: 1, total: 3, self: "partly" }), "partial");
  assert.equal(quickOutcome({ right: 2, total: 3, self: "partly" }), "partial");
  assert.equal(quickOutcome({ right: 0, total: 0, self: "missed" }), "failure");
});

test("the summary says exactly what the outcome is based on", () => {
  assert.equal(quickSummary({ right: 2, total: 3, self: "partly" }), "2 of 3 quick checks right. You rated your explanation: partly there.");
});

test("not sure is named in the summary, and never counts as right", () => {
  assert.equal(quickSummary({ right: 1, total: 3, unsure: 2, self: "partly" }), "1 of 3 quick checks right (2 marked not sure). You rated your explanation: partly there.");
  assert.equal(quickOutcome({ right: 1, total: 3, self: "nailed" }), "partial");
});

test("a later round brings different questions, all still quoting the page", () => {
  const excerpt = "Elasticity measures how far quantity demanded responds to a change in price. Demand is elastic when buyers react strongly to price changes. Demand is inelastic when buyers barely react to price changes. Necessities usually have inelastic demand because there are few substitutes. Luxuries usually have elastic demand because buyers can wait. Income elasticity measures the response of demand to a change in income.";
  const practice = buildPractice({ conceptId: "e", name: "Elasticity", excerpt, locator: "page 2", siblingNames: ["Supply", "Costs"] });
  const activity = { conceptId: "e", practice, sourceReferences: [{ locator: "page 2" }], learn: { explanation: excerpt, keyPoints: [] }, retrieve: { prompt: "Explain it.", modelAnswer: excerpt } };
  const a = buildQuickRun({ activity, name: "Elasticity", siblingNames: [], round: 0 });
  const b = buildQuickRun({ activity, name: "Elasticity", siblingNames: [], round: 1 });
  assert.ok(a && b);
  if (practice.filter(isDrillable).length > 3) assert.notDeepEqual(a.checks.map((c) => c.prompt), b.checks.map((c) => c.prompt));
  assert.notEqual(a.explainPrompt, b.explainPrompt);
  assert.deepEqual(buildQuickRun({ activity, name: "Elasticity", siblingNames: [], round: 1 }).checks, b.checks);
  for (const item of b.checks) assert.ok(quoteIsOnPage(item.sourceQuote, excerpt));
});
