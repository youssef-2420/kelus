import assert from "node:assert/strict";
import test from "node:test";
import { purgeUnsourcedTopics } from "../lib/demo-store.ts";
import { createDemoSnapshot } from "../data/demo-seed.ts";

function stateWithFilenameTopics() {
  const snapshot = createDemoSnapshot(Date.parse("2026-10-06T12:00:00Z"));
  const template = snapshot.concepts[0];
  const bogus = ["Material", "Youssef"].map((name, index) => ({ ...template, id: `c-source-junk${index}`, name }));
  const activities = bogus.map((concept) => ({
    ...snapshot.learningActivities[0],
    id: `a-${concept.id}`,
    conceptId: concept.id,
    sourceReferences: [{ materialId: "material-user", label: "Course Material Youssef", locator: "From filename" }],
  }));
  return {
    state: {
      snapshot: {
        ...snapshot,
        concepts: [...snapshot.concepts, ...bogus],
        learningActivities: [...snapshot.learningActivities, ...activities],
        prompts: [...snapshot.prompts, ...bogus.map((concept) => ({ ...snapshot.prompts[0], id: `p-${concept.id}`, conceptId: concept.id }))],
      },
      nowIso: "2026-10-06T12:00:00Z",
      onboardingCompleted: true,
      diagnosisCompleted: true,
    },
    realCount: snapshot.concepts.length,
  };
}

test("topics made from a file name are removed from saved data, real topics stay", () => {
  const { state, realCount } = stateWithFilenameTopics();
  const { state: cleaned, changed } = purgeUnsourcedTopics(state);
  assert.equal(changed, true);
  assert.equal(cleaned.snapshot.concepts.length, realCount);
  assert.ok(!cleaned.snapshot.concepts.some((concept) => /^(Material|Youssef)$/.test(concept.name)));
  assert.ok(!cleaned.snapshot.learningActivities.some((activity) => activity.sourceReferences.every((reference) => reference.locator === "From filename")));
  assert.ok(!cleaned.snapshot.prompts.some((prompt) => prompt.conceptId.startsWith("c-source-junk")));
});

test("clean data is returned untouched", () => {
  const snapshot = createDemoSnapshot(Date.parse("2026-10-06T12:00:00Z"));
  const state = { snapshot, nowIso: "2026-10-06T12:00:00Z", onboardingCompleted: true, diagnosisCompleted: true };
  const result = purgeUnsourcedTopics(state);
  assert.equal(result.changed, false);
  assert.equal(result.state, state);
});
