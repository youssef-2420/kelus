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
