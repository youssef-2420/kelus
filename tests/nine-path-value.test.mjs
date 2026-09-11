import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("nine-path: sample-first hero, today auto-load, PDF fail UX, inbox docs", async () => {
  const [hero, today, todayPage, materials, pdf, env, setup, map, analytics] = await Promise.all([
    source("components/hero/KelusHero.tsx"),
    source("app/today/TodayClient.tsx"),
    source("app/today/page.tsx"),
    source("components/MaterialLibrary.tsx"),
    source("lib/pdf-extraction.ts"),
    source(".env.example"),
    source("components/FirstRunSetup.tsx"),
    source("app/map/page.tsx"),
    source("lib/analytics.ts"),
  ]);

  assert.match(hero, /Try sample \(~1 min\)/);
  assert.match(hero, /href="\/today\?sample=1"/);
  assert.match(hero, /Set my exam/);
  assert.doesNotMatch(hero, /home-brand/);
  assert.doesNotMatch(hero, /hero-window-controls/);

  assert.match(todayPage, /sample === "1"/);
  assert.match(today, /sample_loaded/);
  assert.doesNotMatch(todayPage, /Opening Today/);
  assert.doesNotMatch(today, /useSearchParams/);
  assert.match(todayPage, /hasRouteHint/);
  assert.match(analytics, /sample_loaded/);

  assert.match(setup, /text-btn setup-sample-cta/);
  assert.match(setup, /Continue with my course/);
  assert.match(map, /Try sample \(~1 min\)/);

  assert.match(pdf, /signal\?: AbortSignal/);
  assert.match(pdf, /throwIfAborted/);
  assert.match(materials, /Cancel OCR/);
  assert.match(materials, /errorKind === "ocr"/);
  assert.match(materials, /material-status-badge/);
  assert.match(materials, /PDF isn’t available on this device anymore/);
  assert.match(materials, /usable English text/);

  assert.match(env, /FormSubmit requires a one-time inbox activation/);
  assert.match(env, /local delivery/);
});
