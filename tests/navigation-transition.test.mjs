import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("root layout applies the shared route transition without changing page routes", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /<RouteTransition>\{children\}<\/RouteTransition>/);
});

test("route transition is keyed by pathname and respects reduced motion", async () => {
  const transition = await source("components/RouteTransition.tsx");
  assert.match(transition, /key=\{pathname\}/);
  assert.match(transition, /useReducedMotion/);
  assert.match(transition, /initial=\{false\}/);
  assert.doesNotMatch(transition, /height:|width:|top:|left:/);
});

test("primary application navigation exposes its active page", async () => {
  const shell = await source("components/AppShell.tsx");
  assert.match(shell, /aria-current=/);
  assert.match(shell, /Today/);
  assert.match(shell, /Map/);
  assert.doesNotMatch(shell, /className=\{path === "\/" \? "is-active"/);
});
