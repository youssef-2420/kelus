import assert from "node:assert/strict";
import test from "node:test";
import { nameNumberedTopics } from "../lib/demo-store.ts";
import { proposeConceptsFromPages, topicNameFrom } from "../domain/material-intelligence.ts";
import { createDemoSnapshot } from "../data/demo-seed.ts";
import { readFileSync } from "node:fs";

test("a topic is never named only by a number", () => {
  assert.equal(topicNameFrom("1", "Application for Schengen Visa. This form is free.", "Page 1"), "Application for Schengen Visa");
  assert.equal(topicNameFrom("2", "", "Page 2"), "Page 2");
  assert.equal(topicNameFrom("Osmosis", "anything", "Page 1"), "Osmosis");
  const pages = [{ pageNumber: 1, text: "1\nSurname of the applicant must match the passport exactly as printed.", blocks: [{ text: "1", fontSize: 20 }, { text: "Surname of the applicant must match the passport exactly as printed.", fontSize: 10 }, { text: "Signature", fontSize: 10 }] }];
  const names = proposeConceptsFromPages({ materialId: "m", sourceLabel: "Form", pages }).map((proposal) => proposal.name);
  assert.ok(names.length && names.every((name) => /\p{L}{3}/u.test(name)), names.join(", "));
});

test("saved topics called 1, 2 or 3 get a name from their own text, and keep their history", () => {
  const snapshot = createDemoSnapshot(Date.parse("2026-10-06T12:00:00Z"));
  const target = snapshot.concepts[0];
  const concepts = snapshot.concepts.map((concept) => (concept.id === target.id ? { ...concept, name: "2" } : concept));
  const state = { snapshot: { ...snapshot, concepts }, nowIso: "2026-10-06T12:00:00Z", onboardingCompleted: true, diagnosisCompleted: true };
  const { state: named, changed } = nameNumberedTopics(state);
  assert.equal(changed, true);
  const renamed = named.snapshot.concepts.find((concept) => concept.id === target.id);
  assert.match(renamed.name, /\p{L}{3}/u);
  assert.equal(named.snapshot.events.length, snapshot.events.length);
  assert.equal(nameNumberedTopics(named).changed, false);
});

test("partly there is a half-filled dot, not a minus, and the done ring fills to the share you got", () => {
  const page = readFileSync(new URL("../app/session/complete/page.tsx", import.meta.url), "utf8");
  const stamp = readFileSync(new URL("../components/MarkStamp.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /"–"/);
  assert.match(page, /<HalfDot \/>/);
  assert.match(page, /fill=\{credit\}/);
  assert.doesNotMatch(stamp, /M44 60H76/);
});

test("search lists each group once, topics first, best match first inside it", async () => {
  const { rankItems } = await import("../lib/search-rank.ts");
  const items = [
    { id: "a", group: "Topics", label: "Diffusion", href: "" },
    { id: "b", group: "Topics", label: "Osmosis", href: "" },
    { id: "c", group: "Go to", label: "Topics", href: "" },
    { id: "d", group: "Topics", label: "Enzymes", href: "" },
    { id: "e", group: "Go to", label: "Progress", href: "" },
  ];
  assert.deepEqual(rankItems(items, "o").map((item) => item.label), ["Osmosis", "Diffusion", "Topics", "Progress"]);
  assert.deepEqual(rankItems(items, "").map((item) => item.id), ["a", "b", "c", "d", "e"]);
});

test("only notes read from a Notion export get Notion's mark; pasted notes do not", async () => {
  const { brandForFile } = await import("../components/BrandIcon.tsx");
  assert.equal(brandForFile("notion-export.md", "text/markdown;variant=notion"), "notion");
  assert.equal(brandForFile("Course.zip", null), "notion");
  assert.equal(brandForFile("Pasted notes.md", "text/markdown"), null);
  assert.equal(brandForFile("lecture.pdf", "application/pdf"), null);
});

test("no gap question from headings or a list that a scan ran together", async () => {
  const { readsAsSentence } = await import("../domain/content-engine.ts");
  assert.equal(readsAsSentence("route plan time fight operation flight monitoring and crew future fights."), false);
  assert.equal(readsAsSentence("Route Planning Flight Monitoring Crew Scheduling Fuel Policy Dispatch Release."), false);
  assert.equal(readsAsSentence("In a hypotonic solution a plant cell gains water and becomes turgid because the cell wall pushes back."), true);
  assert.equal(readsAsSentence("Enzymes are biological catalysts that speed up reactions without being used up."), true);
  assert.equal(readsAsSentence("“Water moves toward the side with more solute because the solute lowers the water potential there.”"), true);
});

test("a scanned page with run-together headings and cut-off lines only yields questions from whole sentences", async () => {
  const { buildPractice } = await import("../domain/content-engine.ts");
  const excerpt = [
    "route planning real time fight operation flight monitoring and crew future fights scheduling dispatch",
    "Operation Control Centre Crew Scheduling Flight Dispatch Maintenance Control Fuel Policy",
    "The operation manager approves the daily flight schedule before it is published to the crews.",
    "Dispatchers prepare the flight plan, the fuel figures and the weather briefing for each departure.",
    "crew rest minimum 10 hours duty time max 13 hours standby reserve",
  ].join("\n");
  const items = buildPractice({ conceptId: "c", name: "Operation manager", excerpt, locator: "Page 1", siblingNames: ["Crew scheduling", "Dispatch"] });
  assert.ok(items.length >= 2);
  for (const item of items) {
    assert.doesNotMatch(item.prompt, /fight operation|Control Centre Crew|crew rest|\. [a-z]/, item.prompt);
  }
});

test("a real sentence that a scan lowercased gets its capital back and can be asked about", async () => {
  const { buildPractice } = await import("../domain/content-engine.ts");
  const excerpt = [
    "route planning real time fight operation flight monitoring and crew future fights.",
    "The operation manager approves the daily flight schedule before it is published to the crews.",
    "flight monitoring tracks every aircraft in real time and alerts the duty manager when a delay exceeds fifteen minutes.",
  ].join("\n");
  const prompts = buildPractice({ conceptId: "c", name: "Operation manager", excerpt, locator: "Page 1", siblingNames: ["Dispatch"] }).map((item) => item.prompt);
  assert.ok(prompts.some((prompt) => /Flight monitoring tracks/.test(prompt)), prompts.join("\n"));
  assert.ok(prompts.every((prompt) => !/fight operation/i.test(prompt)));
});
