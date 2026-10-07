import assert from "node:assert/strict";
import test from "node:test";
import { explainMatch, looksLikeWords } from "../domain/answer-evaluation.ts";

const page = "Osmosis is the movement of water across a partially permeable membrane from a dilute solution to a more concentrated solution.";

test("the explanation step shows which key words of the page you used and which you left out", () => {
  const match = explainMatch("Water moves across a membrane from where there is more water to less water, from dilute to concentrated.", page, "Osmosis");
  assert.ok(match.missed.includes("partially permeable"), "the missing idea is named as one phrase");
  assert.ok(!match.missed.includes("osmosis"), "the topic name is on screen, so leaving it out is not a gap");
  assert.ok(!match.missed.includes("movement"), "\"moves\" covers \"movement\"");
  assert.equal(match.suggest, "partly");
  assert.equal(match.parts.map((part) => part.text).join(""), page, "the page sentence is shown exactly as written");
});

test("a full explanation in the page's words is suggested as nailed, and an empty one as missed", () => {
  assert.equal(explainMatch("Osmosis is when water moves through a partially permeable membrane from a dilute solution into a concentrated solution.", page, "Osmosis").suggest, "nailed");
  assert.equal(explainMatch("", page, "Osmosis").suggest, "missed");
  assert.equal(explainMatch("It is about cells", page, "Osmosis").suggest, "missed");
});

test("key-mashing is not taken as an explanation", () => {
  assert.equal(looksLikeWords("hhhhhhh"), false);
  assert.equal(looksLikeWords("asdfgh"), false);
  assert.equal(looksLikeWords("Water moves in"), true);
});
