import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("mobile landscape hero resets the higher-specificity desktop grid", async () => {
  const css = await source("app/globals.css");
  assert.match(
    css,
    /@media \(max-width: 900px\)[\s\S]*?\.kelus-hero\.home-hero\.is-landscape\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
});

test("first-run course choice is presented honestly instead of as a read-only input", async () => {
  const setup = await source("components/FirstRunSetup.tsx");
  assert.match(setup, /className="destination-course"/);
  assert.doesNotMatch(setup, /autoFocus readOnly/);
});

test("today allocations expose their expandable relationship", async () => {
  const route = await source("components/TodayRoute.tsx");
  assert.match(route, /aria-controls=\{reasoningId\}/);
  assert.match(route, /id=\{reasoningId\}/);
  assert.match(route, /className="plan-disclosure"/);
});

test("application navigation identifies the current page", async () => {
  const shell = await source("components/AppShell.tsx");
  assert.match(shell, /aria-current=/);
});

test("static homepage story does not gate markup behind Reveal wrappers", async () => {
  const afterHero = await source("components/home/HomeAfterHero.tsx");
  assert.doesNotMatch(afterHero, /Reveal/);
  assert.match(afterHero, /LeverageBoard/);
  assert.match(afterHero, /TimeClaim/);
});
