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
  assert.match(header, /Close/);
  assert.doesNotMatch(header, /Open pages|Course space/);
  assert.match(header, /site-session-return/);
  assert.match(await source("app/session/page.tsx"), /study-close/);
  assert.doesNotMatch(shell, /<header|<nav/);
});

test("setup starts with a PDF and shows the full route to study", async () => {
  const [setup, onboarding] = await Promise.all([source("components/FirstRunSetup.tsx"), source("components/CourseStudioOnboarding.tsx")]);
  assert.match(onboarding, /Add PDF[\s\S]*Exam[\s\S]*Confirm topics[\s\S]*First check[\s\S]*Study plan/);
  assert.match(setup, /Add a course PDF/);
  assert.match(setup, /Continue to exam details/);
  assert.match(setup, /Read my PDF/);
  assert.doesNotMatch(setup, /Try sample/);
  assert.doesNotMatch(setup, /destination-brand/);
  assert.doesNotMatch(setup, /setup-progress/);
});

test("session makes the evidence-to-route change explicit", async () => {
  const session = await source("app/session/page.tsx");
  assert.match(session, /aria-label="How this answer affected the route"/);
  assert.match(session, /reroute-whisper/);
  assert.doesNotMatch(session, /reroute-lines|reroute-cause|mastery-reward|answer-comparison/);
  assert.match(session, /answer-pages/);
  assert.match(session, /session-help-page/);
});

test("Today measures return visits without changing the study decision", async () => {
  const today = await source("components/TodayRoute.tsx");
  const analytics = await source("lib/analytics.ts");
  assert.match(today, /today_opened/);
  assert.match(today, /Last answer:/);
  assert.match(analytics, /today_opened/);
});

test("how it works content never depends on viewport-triggered visibility", async () => {
  const how = await source("components/HowItWorks.tsx");
  assert.doesNotMatch(how, /whileInView|viewport:\s*\{/);
  assert.doesNotMatch(how, /BlurText/);
  assert.match(how, /<li key=\{number\}/);
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
  assert.match(rail, /Add a source to build your course model/);
  assert.match(rail, /aria-current="step"/);
  assert.match(rail, /Est\. readiness|First estimate|Today’s stops|Add sources|Confirm topics/);
  assert.doesNotMatch(rail, /Learning loop|Rerouting|course-stage|course-masthead-nav/);
  assert.match(diagnosis, /<AppShell>/);
});

test("the index is a paper TOC; uploaded concepts have a static-exportable detail route", async () => {
  const [map, knowledgeMap, inspector, legacy, detail, panel] = await Promise.all([
    source("app/map/page.tsx"),
    source("components/KnowledgeMap.tsx"),
    source("components/ConceptInspector.tsx"),
    source("app/concept/page.tsx"),
    source("app/concepts/[id]/ConceptDetail.tsx"),
    source("components/TopicMapPanel.tsx"),
  ]);
  assert.match(map, /TopicMapPanel|RevisionSurface/);
  assert.match(panel, /index-toc/);
  assert.match(panel, /Topics by exam weight/);
  assert.doesNotMatch(panel, /ConceptInspector|KnowledgeMap|Find a topic/);
  assert.match(knowledgeMap, /onSelect/);
  assert.match(knowledgeMap, /aria-pressed/);
  assert.match(inspector, /Open full learning history/);
  assert.match(inspector, /\/concept\?id=\$\{encodeURIComponent\(concept\.id\)\}/);
  assert.match(panel, /\/concept\?id=\$\{encodeURIComponent\(concept\.id\)\}/);
  assert.match(legacy, /<ConceptDetail \/>/);
  assert.match(detail, /\/concept\?id=/);
});

test("ledger design keeps the mobile homepage in one column", async () => {
  const css = await source("app/globals.css");
  const layout = await source("app/layout.tsx");
  const header = await source("components/SiteHeader.tsx");
  assert.match(layout, /IBM_Plex_Sans/);
  assert.match(layout, /Literata/);
  assert.match(layout, /exam-booklet\.css/);
  assert.match(layout, /booklet-paper\.css/);
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

test("signed-in header stays focused on the core product", async () => {
  const header = await source("components/SiteHeader.tsx");
  assert.match(header, /auth\.user[\s\S]*PRODUCT_HREFS\.has\(link\.href\)/);
  assert.doesNotMatch(header, /auth\.user[\s\S]*link\.href === "\/route"/);
  assert.doesNotMatch(header, /auth\.user[\s\S]*link\.href === "\/pricing"/);
});

test("pricing free CTA keeps readable contrast against legal link styles", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /legal-panel a:not\(\.cta\)/);
  assert.match(css, /pricing-plan \.cta[\s\S]*color: var\(--color-pure-white\)/);
  assert.match(css, /route-transition[\s\S]*min-height: 0/);
  assert.doesNotMatch(css, /\.route-transition \{ min-height: 100dvh; \}/);
});
