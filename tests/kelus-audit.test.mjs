import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { foundingPaymentConfigured, foundingPaymentLink } from "../lib/founding.ts";
import { looksLikePdf } from "../domain/materials.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("audit 2026: signed-in chrome stays up while learner scopes switch", async () => {
  const [provider, layout] = await Promise.all([
    source("components/LearnerProvider.tsx"),
    source("app/layout.tsx"),
  ]);
  assert.match(provider, /export function LearnerScopeGate/);
  assert.match(layout, /<SiteHeader \/>\s*<LearnerScopeGate>/);
  assert.doesNotMatch(provider, /scopeAligned \? children : <p className="learner-sync-status"/);
});

test("audit 2026: session phases use human labels and complete returns to Today", async () => {
  const [session, complete] = await Promise.all([
    source("app/session/page.tsx"),
    source("app/session/complete/page.tsx"),
  ]);
  assert.match(session, /learn:\s*"Learn"/);
  assert.match(session, /retrieve:\s*"Retrieve"/);
  assert.match(session, /PHASE_LABEL\[phase\]/);
  assert.doesNotMatch(session, /\/ 04 · \{phase\}/);
  assert.match(complete, /Back to Today/);
  assert.doesNotMatch(complete, /Open tomorrow/);
});

test("audit 2026: Exam Pass sells the remaining-day plan, not vapor features", async () => {
  const [pricing, today, complete, week] = await Promise.all([
    source("app/pricing/page.tsx"),
    source("app/today/page.tsx"),
    source("app/session/complete/page.tsx"),
    source("components/ExamWeekPlan.tsx"),
  ]);
  assert.match(pricing, /The remaining days until your exam/);
  assert.match(today, /ExamWeekPlan/);
  assert.match(complete, /ExamWeekPlan/);
  assert.match(week, /Unlock remaining days/);
  assert.match(week, /horizonCapped|planned days/);
  assert.doesNotMatch(pricing, /Priority access to new study features/);
});

test("audit 2026: first-run honesty — manual OCR rescue, soft dismiss, deferred aim", async () => {
  const [materials, soft, setup, today, coverage] = await Promise.all([
    source("components/MaterialLibrary.tsx"),
    source("components/SoftUpgradePrompt.tsx"),
    source("components/FirstRunSetup.tsx"),
    source("app/today/page.tsx"),
    source("domain/exam-coverage.ts"),
  ]);
  assert.match(materials, /Add topics manually/);
  assert.match(materials, /Added manually/);
  assert.match(soft, /PAYWALL_DISMISS_MS|7 \* 24/);
  assert.match(soft, /exam_pass_checkout_clicked/);
  assert.match(soft, /isPaywallDismissed|dismissPaywall/);
  assert.doesNotMatch(setup, /id="exam-target"/);
  assert.match(today, /showAimReadiness|retrievalEvidence/);
  assert.match(coverage, /horizonCapped/);
});

test("audit 2026: workspace rail matches header Map label", async () => {
  const [header, rail] = await Promise.all([
    source("components/SiteHeader.tsx"),
    source("components/CourseWorkspaceRail.tsx"),
  ]);
  assert.match(header, /label:\s*"Map"/);
  assert.match(rail, /label:\s*"Map"/);
  assert.doesNotMatch(rail, /label:\s*"Knowledge Map"/);
});

test("audit 2026: Reveal respects reduced motion", async () => {
  const motion = await source("components/motion/index.tsx");
  assert.match(motion, /useReducedMotion/);
  assert.match(motion, /duration: reduce \? 0\.01 : 0\.5/);
});

test("audit 2026: Stripe payment links are allowlisted", () => {
  assert.equal(foundingPaymentLink(""), "");
  assert.equal(foundingPaymentLink("https://evil.example/pay"), "");
  assert.equal(foundingPaymentLink("http://buy.stripe.com/test"), "");
  assert.equal(foundingPaymentLink("https://buy.stripe.com/test_abc"), "https://buy.stripe.com/test_abc");
  assert.equal(foundingPaymentConfigured(), Boolean(foundingPaymentLink()));
});

test("audit 2026: PDFs must start with %PDF", async () => {
  const pdf = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
  const text = new Blob(["not a pdf"], { type: "application/pdf" });
  assert.equal(await looksLikePdf(pdf), true);
  assert.equal(await looksLikePdf(text), false);
});

test("audit 2026: waitlist notes are capped and outbound links use noopener", async () => {
  const [waitlist, materials, session] = await Promise.all([
    source("lib/waitlist.ts"),
    source("components/MaterialLibrary.tsx"),
    source("app/session/page.tsx"),
  ]);
  assert.match(waitlist, /slice\(0,\s*500\)/);
  assert.match(materials, /rel="noopener noreferrer"/);
  assert.match(session, /rel="noopener noreferrer"/);
});

test("audit 2026: edge headers, robots disallows, and shared-device privacy", async () => {
  const [headers, robots, privacy, css] = await Promise.all([
    source("public/_headers"),
    source("app/robots.ts"),
    source("app/privacy/page.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
  assert.match(headers, /Content-Security-Policy-Report-Only:/);
  assert.match(robots, /disallow:\s*\[\s*"\/today\/"/);
  assert.match(privacy, /Shared devices/);
  assert.match(css, /\.skip:focus-visible/);
  assert.match(css, /\.session-help button,[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.auth-close[\s\S]*?width:\s*44px/);
});

test("audit 2026: Exam Pass unlock is edge-verified, not forgeable localStorage", async () => {
  const [pass, capture, redeem, worker, terms, env, privacy] = await Promise.all([
    source("lib/exam-pass.ts"),
    source("components/ExamPassCapture.tsx"),
    source("components/ExamPassRedeem.tsx"),
    source("workers/kelus.js"),
    source("app/terms/page.tsx"),
    source(".env.example"),
    source("app/privacy/page.tsx"),
  ]);
  assert.match(pass, /\/api\/exam-pass\/redeem/);
  assert.match(pass, /\/api\/exam-pass\/status/);
  assert.doesNotMatch(pass, /localStorage\.setItem\(examPassStorageKey/);
  assert.doesNotMatch(capture, /activateExamPass\(\)/);
  assert.match(capture, /redeemExamPass/);
  assert.match(redeem, /Unlock Exam Pass/);
  assert.match(worker, /HttpOnly/);
  assert.match(worker, /checkout\/sessions/);
  assert.match(terms, /Exam Pass/);
  assert.match(terms, /14 days/);
  assert.match(privacy, /HttpOnly cookie|verified by the Kelus edge/);
  assert.doesNotMatch(env, /today\/\?pass=1/);
});
