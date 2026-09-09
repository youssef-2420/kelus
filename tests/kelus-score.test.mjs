import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("score: analytics_storage defaults to denied and loads only after grant", async () => {
  const [ga, analytics, banner, layout] = await Promise.all([
    source("components/GoogleAnalytics.tsx"),
    source("lib/analytics.ts"),
    source("components/AnalyticsConsentBanner.tsx"),
    source("app/layout.tsx"),
  ]);

  assert.match(ga, /analytics_storage:\s*"denied"/);
  assert.doesNotMatch(ga, /analytics_storage:\s*"granted"\s*\n\s*\}\);[\s\S]*consent",\s*"default"/);
  assert.match(ga, /kelus:analytics-consent:v1|ANALYTICS_CONSENT_KEY/);
  assert.match(ga, /consent === "granted"/);
  assert.match(ga, /googletagmanager\.com\/gtag\/js/);
  assert.match(analytics, /ANALYTICS_CONSENT_KEY\s*=\s*"kelus:analytics-consent:v1"/);
  assert.match(analytics, /analyticsConsentGranted/);
  assert.match(analytics, /analyticsEnabled\(\)[\s\S]*analyticsConsentGranted/);
  assert.match(banner, /Accept/);
  assert.match(banner, /Decline/);
  assert.match(banner, /role="dialog"/);
  assert.match(layout, /GoogleAnalytics/);
});

test("score: privacy describes opt-in analytics choice", async () => {
  const privacy = await source("app/privacy/page.tsx");
  assert.match(privacy, /Accept|Decline|choice/i);
  assert.match(privacy, /kelus:analytics-consent:v1/);
  assert.match(privacy, /off until you Accept|Decline keeps them off/i);
});

test("score: CSP is report-only and workers_dev is false", async () => {
  const [headers, wrangler] = await Promise.all([
    source("public/_headers"),
    source("wrangler.toml"),
  ]);

  assert.match(headers, /Strict-Transport-Security:/);
  assert.match(headers, /Content-Security-Policy-Report-Only:/);
  assert.doesNotMatch(headers, /^[^#\n]*Content-Security-Policy:/m);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /X-Frame-Options:\s*DENY/);
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/);
  assert.match(headers, /googletagmanager\.com/);
  assert.match(headers, /\*\.supabase\.co/);
  assert.match(headers, /formsubmit\.co/);
  assert.match(headers, /buy\.stripe\.com/);
  assert.match(headers, /worker-src[^;]*blob:/);
  assert.match(wrangler, /workers_dev\s*=\s*false/);
  assert.doesNotMatch(wrangler, /workers_dev\s*=\s*true/);
  assert.match(wrangler, /main\s*=\s*"\.\/workers\/kelus\.js"/);
  assert.match(wrangler, /binding\s*=\s*"ASSETS"/);
});
