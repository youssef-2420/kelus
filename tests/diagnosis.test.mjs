import assert from "node:assert/strict";
import test from "node:test";
import { selectDiagnosisConcept } from "../domain/diagnosis.ts";

const concept = (id, examImportance) => ({ id, name: id, examImportance, confidence: 0 });

test("diagnosis begins with the highest-value uncertain concept", () => {
  const selected = selectDiagnosisConcept({
    concepts: [concept("low", 0.4), concept("high", 0.95)],
    relationships: [],
    ratings: { low: "weak", high: "weak" },
    evidence: [],
  });
  assert.equal(selected?.concept.id, "high");
});

test("a failed answer checks an available prerequisite next", () => {
  const selected = selectDiagnosisConcept({
    concepts: [concept("foundation", 0.6), concept("advanced", 0.95), concept("other", 0.8)],
    relationships: [{ id: "r1", fromId: "foundation", toId: "advanced", kind: "prerequisite" }],
    ratings: { foundation: "okay", advanced: "weak", other: "weak" },
    evidence: [{ conceptId: "advanced", outcome: "failure" }],
  });
  assert.equal(selected?.concept.id, "foundation");
  assert.match(selected?.reason ?? "", /prerequisite/);
});

test("diagnosis stops early after consistent success with no reported gaps", () => {
  const selected = selectDiagnosisConcept({
    concepts: [concept("a", 0.9), concept("b", 0.8), concept("c", 0.7)],
    relationships: [],
    ratings: { a: "strong", b: "strong", c: "okay" },
    evidence: [{ conceptId: "a", outcome: "success" }, { conceptId: "b", outcome: "success" }],
  });
  assert.equal(selected, null);
});
