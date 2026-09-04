import assert from "node:assert/strict";
import test from "node:test";
import { allocateStudyRoute } from "../lib/study-route.ts";

test("study route spends the full session budget even with seven stops", () => {
  const crowded = Array.from({ length: 7 }, (_, index) => ({
    concept: { id: `c${index}`, name: `C${index}`, importance: 0.5, mastery: 0.3 },
    status: "weak",
    priority: 1 + index / 10,
  }));
  const crowdedStops = allocateStudyRoute(crowded, 45);
  assert.equal(crowdedStops.reduce((sum, stop) => sum + stop.minutes, 0), 45);
});

test("study route spends the full session budget", () => {
  const rows = [
    { concept: { id: "a", name: "A", importance: 0.9, mastery: 0.3 }, status: "weak", priority: 2 },
    { concept: { id: "b", name: "B", importance: 0.7, mastery: 0.5 }, status: "fading", priority: 1.2 },
    { concept: { id: "c", name: "C", importance: 0.4, mastery: 0.2 }, status: "not_learned", priority: 0.8 },
  ];
  const stops = allocateStudyRoute(rows, 45);
  const minutes = stops.reduce((sum, stop) => sum + stop.minutes, 0);
  assert.equal(minutes, 45);
  assert.ok(stops.every((stop) => stop.minutes >= 5));
  assert.equal(stops.at(-1)?.name, "Mixed retrieval");
});
