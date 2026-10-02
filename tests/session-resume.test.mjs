import assert from "node:assert/strict";
import test from "node:test";
import { resumeSessionIndex } from "../domain/session-engine.ts";

const session = { id: "session-1", plannedConceptIds: ["elasticity", "demand", "markets"] };

test("resume skips only topics with recorded retrievals in this session", () => {
  const events = [
    { sessionId: "another-session", conceptId: "elasticity", kind: "retrieval" },
    { sessionId: "session-1", conceptId: "elasticity", kind: "hint_used" },
  ];
  assert.equal(resumeSessionIndex(session, events), 0);
  assert.equal(resumeSessionIndex(session, [...events, { sessionId: "session-1", conceptId: "elasticity", kind: "retrieval" }]), 1);
  assert.equal(resumeSessionIndex(session, [
    ...events,
    { sessionId: "session-1", conceptId: "elasticity", kind: "retrieval" },
    { sessionId: "session-1", conceptId: "demand", kind: "retrieval" },
  ]), 2);
});
