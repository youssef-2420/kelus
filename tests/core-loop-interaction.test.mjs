import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  DIAGNOSIS_ERRORS,
  DIAGNOSIS_INTERACTIONS,
  MATERIALS_ERRORS,
  MATERIALS_INTERACTIONS,
  MATERIALS_LOADING,
  PHASE_MOTION,
} from "../lib/core-loop-interaction-spec.ts";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("core-loop interaction design", () => {
  it("specifies materials micro-interactions with keyboard alternatives for gestures", () => {
    assert.ok(MATERIALS_INTERACTIONS.length >= 4);
    const drop = MATERIALS_INTERACTIONS.find((item) => item.name.includes("Drop"));
    assert.match(drop.keyboardAlt, /file picker/i);
    assert.match(MATERIALS_LOADING.over10s, /Cancel OCR/);
    assert.match(MATERIALS_ERRORS.recovery, /sample course/i);
    assert.equal(PHASE_MOTION.pressMs, 80);
  });

  it("wires materials busy feedback: aria-busy, live status, cancel, soft notices", async () => {
    const materials = await source("components/MaterialLibrary.tsx");
    assert.match(materials, /aria-busy=\{busy/);
    assert.match(materials, /material-work-status/);
    assert.match(materials, /aria-live="polite"/);
    assert.match(materials, /Cancel OCR/);
    assert.match(materials, /role="status"/);
    assert.match(materials, /softNotice/);
  });

  it("specifies diagnosis interactions with prevention-first errors", () => {
    assert.ok(DIAGNOSIS_INTERACTIONS.some((item) => item.name.includes("Rate")));
    assert.match(DIAGNOSIS_ERRORS.prevention, /Continue\/Skip/);
  });

  it("wires diagnosis phase motion, evaluation focus, and rating press affordance", async () => {
    const [diagnosis, css] = await Promise.all([
      source("components/InitialDiagnosis.tsx"),
      source("app/globals.css"),
    ]);
    assert.match(diagnosis, /AnimatePresence/);
    assert.match(diagnosis, /diagnosis-evaluation-title/);
    assert.match(diagnosis, /tabIndex=\{-1\}/);
    assert.match(css, /diagnosis-list button:active/);
    assert.match(css, /material-work-steps/);
  });
});
