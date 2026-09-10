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
  assert.doesNotMatch(transition, /initial=\{[^\n]*opacity:\s*0/);
  assert.doesNotMatch(transition, /AnimatePresence/);
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
  assert.match(header, /pathname\.startsWith\("\/session"\)/);
  assert.match(header, /Pause and return to Today/);
  assert.doesNotMatch(shell, /<header|<nav/);
});

test("setup shows the real four-step path before the optional sample", async () => {
  const setup = await source("components/FirstRunSetup.tsx");
  assert.match(setup, /aria-label="Getting started"/);
  assert.match(setup, /Step 1 · Your destination/);
  assert.match(setup, /Exam[\s\S]*Lessons[\s\S]*Quick check[\s\S]*Today/);
  assert.ok(setup.indexOf("Tell Kelus what you are preparing for") < setup.indexOf("Just looking?"));
  assert.doesNotMatch(setup, /destination-brand/);
});

test("session makes the evidence-to-route change explicit", async () => {
  const session = await source("app/session/page.tsx");
  assert.match(session, /aria-label="How this answer affected the route"/);
  assert.match(session, /Your answer/);
  assert.match(session, /Learner estimate/);
  assert.match(session, /Next route/);
});

test("how it works content never depends on viewport-triggered visibility", async () => {
  const how = await source("components/HowItWorks.tsx");
  assert.doesNotMatch(how, /whileInView|viewport:\s*\{/);
  assert.doesNotMatch(how, /BlurText/);
  assert.match(how, /<li key=\{stage\.number\}>/);
});

test("the course workspace keeps destination and setup progress across product pages", async () => {
  const [shell, rail, diagnosis] = await Promise.all([
    source("components/AppShell.tsx"),
    source("components/CourseWorkspaceRail.tsx"),
    source("components/InitialDiagnosis.tsx"),
  ]);
  assert.match(shell, /CourseWorkspaceRail/);
  assert.match(rail, /Current course/);
  assert.match(rail, /Learning loop/);
  assert.match(rail, /Materials/);
  assert.match(rail, /Evaluation/);
  assert.match(rail, /Rerouting/);
  assert.match(rail, /aria-current="step"/);
  assert.match(rail, /course-stage/);
  assert.match(diagnosis, /<AppShell>/);
});

test("the knowledge map owns concept inspection while canonical pages remain shareable", async () => {
  const [map, knowledgeMap, inspector, legacy, detail] = await Promise.all([
    source("app/map/page.tsx"),
    source("components/KnowledgeMap.tsx"),
    source("components/ConceptInspector.tsx"),
    source("app/concept/page.tsx"),
    source("app/concepts/[id]/ConceptDetail.tsx"),
  ]);
  assert.match(map, /ConceptInspector/);
  assert.match(map, /AnimatePresence/);
  assert.match(knowledgeMap, /onSelect/);
  assert.match(knowledgeMap, /aria-pressed/);
  assert.match(inspector, /Open full learning history/);
  assert.match(inspector, /\/concepts\/\$\{encodeURIComponent\(concept\.id\)\}/);
  assert.match(legacy, /router\.replace\(id \? `\/concepts\//);
  assert.doesNotMatch(detail, /\/concept\?id=/);
});

test("ledger design keeps the mobile homepage in one column", async () => {
  const css = await source("app/globals.css");
  const layout = await source("app/layout.tsx");
  const header = await source("components/SiteHeader.tsx");
  assert.match(layout, /Inter/);
  assert.match(layout, /Source_Serif_4/);
  assert.match(layout, /notion-paper\.css/);
  assert.match(css, /\.kelus-hero\.home-hero\.is-student\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /--color-indigo-ink/);
  assert.match(header, /href: "\/materials"/);
  assert.match(layout, /revision-studio\.css/);
});

test("core product nav is visible without sign-in or onboarding", async () => {
  const header = await source("components/SiteHeader.tsx");
  assert.match(header, /href: "\/today".*always: true/s);
  assert.match(header, /href: "\/materials".*always: true/s);
  assert.match(header, /href: "\/map".*always: true/s);
  assert.doesNotMatch(header, /href: "\/materials".*always: false/s);
  assert.doesNotMatch(header, /href: "\/map".*always: false/s);
});

test("pricing free CTA keeps readable contrast against legal link styles", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /legal-panel a:not\(\.cta\)/);
  assert.match(css, /pricing-plan \.cta[\s\S]*color: var\(--color-pure-white\)/);
  assert.match(css, /route-transition[\s\S]*min-height: 0/);
  assert.doesNotMatch(css, /\.route-transition \{ min-height: 100dvh; \}/);
});
