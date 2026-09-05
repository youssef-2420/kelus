import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("root layout applies the shared route transition without changing page routes", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /<SiteHeader \/>/);
  assert.ok(layout.indexOf("<SiteHeader />") < layout.indexOf("<RouteTransition>"));
  assert.match(layout, /<RouteTransition>\{children\}<\/RouteTransition>/);
});

test("route transition is keyed by pathname and respects reduced motion", async () => {
  const transition = await source("components/RouteTransition.tsx");
  assert.match(transition, /key=\{pathname\}/);
  assert.match(transition, /useReducedMotion/);
  assert.match(transition, /initial=\{false\}/);
  assert.doesNotMatch(transition, /height:|width:|top:|left:/);
});

test("one persistent header owns navigation for every page", async () => {
  const header = await source("components/SiteHeader.tsx");
  const shell = await source("components/AppShell.tsx");
  assert.match(header, /aria-current=/);
  assert.match(header, /href: "\/materials"/);
  assert.match(header, /href: "\/map"/);
  assert.match(header, /href: "\/route"/);
  assert.match(header, /className="site-auth-button"/);
  assert.match(header, /auth\.openDialog/);
  assert.doesNotMatch(shell, /<header|<nav/);
});

test("ledger design keeps the mobile homepage in one column", async () => {
  const css = await source("app/globals.css");
  const layout = await source("app/layout.tsx");
  const header = await source("components/SiteHeader.tsx");
  assert.match(layout, /Inter_Tight/);
  assert.match(css, /\.kelus-hero\.home-hero\.is-student\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /--color-indigo-ink/);
  assert.match(header, /href: "\/materials"/);
});
