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
  const [analytics, ga, workflow] = await Promise.all([
    source("lib/analytics.ts"),
    source("components/GoogleAnalytics.tsx"),
    source(".github/workflows/restore-kelus-dns.yml"),
  ]);
  assert.match(analytics, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(ga, /if \(!GA_MEASUREMENT_ID\) return null/);
  assert.match(ga, /anonymize_ip: true/);
  assert.match(ga, /allow_google_signals: false/);
  assert.match(workflow, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
});

test("waitlist capture persists locally and can POST to an optional endpoint", async () => {
  const waitlist = await source("lib/waitlist.ts");
  assert.match(waitlist, /localStorage/);
  assert.match(waitlist, /NEXT_PUBLIC_WAITLIST_ENDPOINT/);
  assert.match(waitlist, /submitWaitlistSignup/);
});

test("ready-to-today path keeps diagnosis short", async () => {
  const [diagnosis, ui, materials] = await Promise.all([
    source("domain/diagnosis.ts"),
    source("components/InitialDiagnosis.tsx"),
    source("components/MaterialLibrary.tsx"),
  ]);
  assert.match(diagnosis, /maximumChecks \?\? 2/);
  assert.match(ui, /slice\(0, 3\)/);
  assert.match(ui, /maximumChecks: 2/);
  assert.match(materials, /Continue to stop 1/);
});
