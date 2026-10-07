import assert from "node:assert/strict";
import test from "node:test";
import { confidentOcrText } from "../lib/pdf-extraction.ts";

test("misread scan lines are dropped; confident lines keep their paragraphs", () => {
  const data = {
    text: "ignored",
    blocks: [
      { paragraphs: [{ lines: [{ text: "Osmosis is the movement of water across a membrane.", confidence: 91 }, { text: "omaliance tet Sralysing fuel co", confidence: 41 }] }] },
      { paragraphs: [{ lines: [{ text: "Alrerat all acation", confidence: 52 }] }, { lines: [{ text: "Diffusion needs no energy.", confidence: 88 }] }] },
    ],
  };
  assert.equal(confidentOcrText(data), "Osmosis is the movement of water across a membrane.\n\nDiffusion needs no energy.");
});

test("a page with nothing confident gives no text at all, so it counts as unreadable", () => {
  assert.equal(confidentOcrText({ text: "x", blocks: [{ paragraphs: [{ lines: [{ text: "flight monitoring", confidence: 55 }] }] }] }), "");
  assert.equal(confidentOcrText({ text: "Plain text without layout", confidence: 40, blocks: null }), "");
  assert.equal(confidentOcrText({ text: "Plain text without layout", confidence: 85, blocks: null }), "Plain text without layout");
});
