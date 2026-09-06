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
  assert.match(terms, /not grades|not a guarantee|exam outcomes|Guidance/i);
  assert.match(waitlist, /WaitlistForm/);
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
  assert.match(ui, /maximumChecks: 2/);
  assert.match(materials, /Continue:\ short\ check,\ then\ study/);
  assert.match(materials, /Try\ the\ sample\ course/);
  assert.match(materials, /SoftUpgradePrompt/);
  assert.match(materials, /proposeConceptsFromMetadata|mode:\s*"relaxed"/);
  assert.match(complete, /WaitlistForm|SoftUpgradePrompt/);
  assert.match(header, /auth\.configured/);
  assert.match(setup, /Try\ a\ sample\ course/);
  assert.match(how, /SiteFooter/);
});

test("pricing conversion loop is linked from product surfaces", async () => {
  const [pricing, footer, sitemap, home, soft, analytics, header, complete] = await Promise.all([
    source("app/pricing/page.tsx"),
    source("components/SiteFooter.tsx"),
    source("app/sitemap.ts"),
    source("components/home/HomeAfterHero.tsx"),
    source("components/SoftUpgradePrompt.tsx"),
    source("lib/analytics.ts"),
    source("components/SiteHeader.tsx"),
    source("app/session/complete/page.tsx"),
  ]);
  assert.match(pricing, /Founding student/);
  assert.match(pricing, /\$9/);
  assert.match(pricing, /WaitlistForm/);
  assert.match(footer, /\/pricing/);
  assert.match(sitemap, /\/pricing\//);
  assert.match(home, /\/pricing/);
  assert.match(header, /\/pricing/);
  assert.match(soft, /soft_paywall_shown/);
  assert.match(soft, /sync/i);
  assert.doesNotMatch(soft, /unlocks more materials/i);
  assert.match(analytics, /pricing_viewed/);
  assert.match(analytics, /soft_paywall_shown/);
  assert.match(complete, /SoftUpgradePrompt/);
  assert.match(complete, /WaitlistForm/);
});
