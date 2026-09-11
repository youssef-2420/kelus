import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("root layout keeps the shell outside page ViewTransitions", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /<SiteHeader \/>/);
  assert.ok(layout.indexOf("<SiteHeader />") < layout.indexOf("<RouteTransition>"));
  assert.match(layout, /<RouteTransition>\{children\}<\/RouteTransition>/);
  assert.match(layout, /view-transitions\.css/);
  assert.doesNotMatch(layout, /<ViewTransition|DirectionalPage|LateralPage/);
});

test("route transition is a layout shell; pages own ViewTransition motion", async () => {
  const transition = await source("components/RouteTransition.tsx");
  const pages = await source("components/PageTransition.tsx");
  assert.match(transition, /className="route-transition"/);
  assert.doesNotMatch(transition, /pathname|useReducedMotion|AnimatePresence|import \{[^}]*ViewTransition/);
  assert.match(pages, /import \{ ViewTransition \} from "react"/);
  assert.match(pages, /nav-forward/);
  assert.match(pages, /nav-back/);
  assert.match(pages, /fade-in/);
  assert.match(pages, /text-morph|default="none"/);
});

test("map to concept navigation is hierarchical with shared titles", async () => {
  const [map, knowledgeMap, inspector, detail, css, header] = await Promise.all([
    source("app/map/page.tsx"),
    source("components/KnowledgeMap.tsx"),
    source("components/ConceptInspector.tsx"),
    source("app/concepts/[id]/ConceptDetail.tsx"),
    source("app/view-transitions.css"),
    source("components/SiteHeader.tsx"),
  ]);
  assert.match(map, /DirectionalPage/);
  assert.match(knowledgeMap, /transitionTypes=\{\["nav-forward"\]\}/);
  assert.match(knowledgeMap, /ConceptTitleTransition/);
  assert.match(inspector, /transitionTypes=\{\["nav-forward"\]\}/);
  assert.match(inspector, /ConceptTitleTransition/);
  assert.match(detail, /transitionTypes=\{\["nav-back"\]\}/);
  assert.match(detail, /ConceptTitleTransition/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /::view-transition-group\(site-header\)/);
  assert.match(header, /viewTransitionName:\s*"site-header"/);
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
  assert.match(setup, /setup-sequence/);
  assert.match(setup, /Exam[\s\S]*Lessons[\s\S]*Quick check[\s\S]*Today/);
  assert.ok(setup.indexOf("Tell Kelus what you are preparing for") < setup.indexOf("Just looking?"));
  assert.doesNotMatch(setup, /destination-brand/);
  assert.doesNotMatch(setup, /setup-progress/);
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
  assert.match(shell, /is-booklet-shell/);
  assert.match(rail, /Current course/);
  assert.match(rail, /course-masthead/);
  assert.match(rail, /materialsReady/);
  assert.match(rail, /Sample course model ready/);
  assert.match(rail, /aria-current="step"/);
  assert.match(rail, /Est\. readiness|Quick check|Today’s route|Add materials/);
  assert.doesNotMatch(rail, /Learning loop|Rerouting|course-stage|course-masthead-nav/);
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
  assert.match(layout, /IBM_Plex_Sans/);
  assert.match(layout, /Newsreader/);
  assert.match(layout, /exam-booklet\.css/);
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
