import assert from "node:assert/strict";
import test from "node:test";
import { storeAnalyticsEvent } from "../services/server-analytics.ts";

test("funnel and unsupported-search analytics persist normalized bounded fields", async () => {
  const rows = [];
  const db = { prepare: () => ({ bind(...values) { rows.push(values); return this; }, async run() { return {}; } }) };
  assert.equal(await storeAnalyticsEvent(db, { name: "product_resolved", productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new" }, new Date("2026-08-28T12:00:00Z")), true);
  assert.equal(await storeAnalyticsEvent(db, { name: "search_unsupported", query: "  Dyson!!!   Headphones  " }, new Date("2026-08-28T12:01:00Z")), true);
  assert.equal(rows[1][5], "dyson headphones");
  assert.equal(await storeAnalyticsEvent(db, { name: "unknown_event" }), false);
});
