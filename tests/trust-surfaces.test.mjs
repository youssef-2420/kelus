import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("privacy, terms, and waitlist pages ship with local-first trust copy", async () => {
  const [privacy, terms, waitlist, footer, sitemap, layout] = await Promise.all([
    source("app/privacy/page.tsx"),
    source("app/terms/page.tsx"),
    source("app/waitlist/page.tsx"),
    source("components/SiteFooter.tsx"),
    source("app/sitemap.ts"),
    source("app/layout.tsx"),
  ]);

  assert.match(privacy, /local-first/i);
  assert.match(privacy, /analytics/i);
  assert.match(privacy, /hello@kelus\.me/);
  assert.match(privacy, /Optional account and sync/i);
  assert.match(privacy, /private storage/i);
  assert.doesNotMatch(privacy, /future sync feature/i);
  assert.match(terms, /not grades|not a guarantee|exam outcomes|Guidance/i);
  assert.match(terms, /sync learning state and course PDFs/i);
  assert.match(waitlist, /WaitlistForm/);
  assert.match(waitlist, /Sign in free anytime to sync/i);
  assert.match(footer, /\/privacy/);
  assert.match(footer, /\/waitlist/);
  assert.match(sitemap, /\/privacy\//);
  assert.match(sitemap, /\/waitlist\//);
  assert.match(layout, /GoogleAnalytics/);
});

test("analytics only loads when a measurement id is configured", async () => {
  const [analytics, ga, workflow, today] = await Promise.all([
    source("lib/analytics.ts"),
    source("components/GoogleAnalytics.tsx"),
    source(".github/workflows/restore-kelus-dns.yml"),
    source("app/today/page.tsx"),
  ]);
  assert.match(analytics, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(ga, /if \(!GA_MEASUREMENT_ID\) return null/);
  assert.match(ga, /anonymize_ip: true/);
  assert.match(ga, /allow_google_signals: false/);
  assert.match(workflow, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(today, /session_started/);
});

test("waitlist capture stays honest without a remote endpoint", async () => {
  const [waitlist, form] = await Promise.all([
    source("lib/waitlist.ts"),
    source("components/WaitlistForm.tsx"),
  ]);
  assert.match(waitlist, /localStorage/);
  assert.match(waitlist, /NEXT_PUBLIC_WAITLIST_ENDPOINT/);
  assert.match(waitlist, /submitWaitlistSignup/);
  assert.match(waitlist, /delivery: "local"/);
  assert.match(form, /Remote waitlist delivery isn’t configured|on-device until remote delivery/i);
});

test("client questions page captures name email and question for inbox delivery", async () => {
  const [page, form, lib, footer, sitemap, privacy, envExample, pagesWorkflow, restoreWorkflow, analytics] = await Promise.all([
    source("app/questions/page.tsx"),
    source("components/QuestionsForm.tsx"),
    source("lib/questions.ts"),
    source("components/SiteFooter.tsx"),
    source("app/sitemap.ts"),
    source("app/privacy/page.tsx"),
    source(".env.example"),
    source(".github/workflows/pages.yml"),
    source(".github/workflows/restore-kelus-dns.yml"),
    source("lib/analytics.ts"),
  ]);
  assert.match(page, /QuestionsForm/);
  assert.match(page, /Ask us anything about Kelus/);
  assert.match(form, /Send in browser|Send question/);
  assert.match(form, /Email hello@kelus\.me|hello@kelus\.me/);
  assert.match(lib, /formsubmit\.co\/ajax\/\$\{DEFAULT_QUESTIONS_INBOX\}|formsubmit\.co\/ajax\/hello@kelus\.me/);
  assert.match(lib, /DEFAULT_QUESTIONS_INBOX = "hello@kelus\.me"/);
  assert.match(lib, /submitClientQuestion/);
  assert.match(lib, /_subject/);
  assert.match(lib, /delivery: "local"/);
  assert.match(footer, /\/questions/);
  assert.match(sitemap, /\/questions\//);
  assert.match(privacy, /Questions inbox/i);
  assert.match(envExample, /NEXT_PUBLIC_QUESTIONS_ENDPOINT/);
  assert.match(pagesWorkflow, /NEXT_PUBLIC_QUESTIONS_ENDPOINT/);
  assert.match(restoreWorkflow, /NEXT_PUBLIC_QUESTIONS_ENDPOINT/);
  assert.match(analytics, /question_submitted/);
});

test("ready-to-today path stays short and does not overpromise stop 1", async () => {
  const [diagnosis, ui, materials, complete, header, setup, how] = await Promise.all([
    source("domain/diagnosis.ts"),
    source("components/InitialDiagnosis.tsx"),
    source("components/MaterialLibrary.tsx"),
    source("app/session/complete/page.tsx"),
    source("components/SiteHeader.tsx"),
    source("components/FirstRunSetup.tsx"),
    source("components/HowItWorks.tsx"),
  ]);
  assert.match(diagnosis, /maximumChecks \?\? 2/);
  assert.match(ui, /slice\(0, 3\)/);
  assert.match(ui, /DIAGNOSIS_RETRIEVAL_LIMIT/);
  assert.match(materials, /Continue:\ short\ check,\ then\ study/);
  assert.match(materials, /Try sample \(~1 min\)|Try the sample course/);
  assert.match(materials, /SoftUpgradePrompt/);
  assert.match(materials, /proposeConceptsFromMetadata|mode:\s*"relaxed"/);
  assert.match(complete, /WaitlistForm|SoftUpgradePrompt/);
  assert.match(header, /auth\.configured/);
  assert.match(setup, /Try sample \(~1 min\)/);
  assert.match(setup, /cta setup-sample-cta/);
  assert.match(how, /SiteFooter/);
});

test("primary CTA language and readiness stay consistent", async () => {
  const [hero, header, home, today, how] = await Promise.all([
    source("components/hero/KelusHero.tsx"),
    source("components/SiteHeader.tsx"),
    source("components/home/HomeAfterHero.tsx"),
    source("app/today/page.tsx"),
    source("components/HowItWorks.tsx"),
  ]);
  assert.match(hero, /home-brand/);
  assert.match(hero, /Try sample \(~1 min\)/);
  assert.match(hero, /today\?sample=1/);
  assert.match(hero, /Build with my PDF/);
  assert.doesNotMatch(hero, /hero-window-controls/);
  assert.match(header, /Build today’s route/);
  assert.match(home, /Build today’s route/);
  assert.doesNotMatch(home, /Make today’s plan|Start with my course|Build today’s plan/);
  assert.match(how, /Build today’s route/);
  assert.match(today, /Est\. readiness/);
  assert.match(today, /not a grade prediction/);
  assert.match(today, /get\("sample"\) === "1"/);
  assert.match(today, /Try sample \(~1 min\)/);
});

test("pricing conversion loop is linked from product surfaces", async () => {
  const [pricing, footer, sitemap, home, soft, analytics, header, complete, auth, envExample, founding] = await Promise.all([
    source("app/pricing/page.tsx"),
    source("components/SiteFooter.tsx"),
    source("app/sitemap.ts"),
    source("components/home/HomeAfterHero.tsx"),
    source("components/SoftUpgradePrompt.tsx"),
    source("lib/analytics.ts"),
    source("components/SiteHeader.tsx"),
    source("app/session/complete/page.tsx"),
    source("components/SignInDialog.tsx"),
    source(".env.example"),
    source("components/FoundingCta.tsx"),
  ]);
  assert.match(pricing, /Exam Pass/);
  assert.match(pricing, /\$9/);
  assert.match(pricing, /Pay for one exam/);
  assert.match(pricing, /FoundingCta|WaitlistForm/);
  assert.match(pricing, /Optional free sign-in to sync across devices/);
  assert.match(pricing, /Priority access to new study features/);
  assert.doesNotMatch(pricing, /Cross-device course and learning-state sync/);
  assert.match(footer, /\/pricing/);
  assert.match(sitemap, /\/pricing\//);
  assert.match(home, /\/pricing/);
  assert.match(header, /\/pricing/);
  assert.match(soft, /soft_paywall_shown/);
  assert.match(soft, /exam date/i);
  assert.match(soft, /Sign in/);
  assert.doesNotMatch(soft, /planned \$9/);
  assert.doesNotMatch(soft, /unlocks more materials/i);
  assert.match(analytics, /pricing_viewed/);
  assert.match(analytics, /soft_paywall_shown/);
  assert.match(complete, /SoftUpgradePrompt/);
  assert.match(complete, /WaitlistForm/);
  assert.match(complete, /completedSessions === 1/);
  assert.match(complete, /completedSessions >= 2/);
  assert.match(auth, /Sync this course, its PDFs, and your learning evidence across devices/);
  assert.doesNotMatch(auth, /future cross-device sync/);
  assert.match(envExample, /NEXT_PUBLIC_EXAM_PASS_PAYMENT_LINK/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_STRIPE_PAYMENT_LINK/);
  assert.match(founding, /Sync across devices is included with\s+free sign-in|Sync across devices is already available/s);
});

test("materials stay honest about PDF OCR limits and bookmark-only links", async () => {
  const [materials, map] = await Promise.all([
    source("components/MaterialLibrary.tsx"),
    source("app/map/page.tsx"),
  ]);
  assert.match(materials, /Prefer a text PDF/);
  assert.match(materials, /first 8 (weak )?pages|first 12 pages/);
  assert.match(materials, /Bookmarks stay on your shelf/);
  assert.match(materials, /Save bookmark/);
  assert.match(materials, /Bookmark ·/);
  assert.match(materials, /replaces your current map and asks you to redo/);
  assert.match(map, /Set your exam first/);
  assert.match(map, /Set your exam/);
});
