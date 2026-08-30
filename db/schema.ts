import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const priceObservations = sqliteTable("price_observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  canonicalProductId: text("canonical_product_id").notNull(),
  variantId: text("variant_id").notNull(),
  providerId: text("provider_id").notNull(),
  retailerId: text("retailer_id").notNull(),
  offerId: text("offer_id").notNull(),
  priceCents: integer("price_cents").notNull(),
  shippingCents: integer("shipping_cents"),
  currency: text("currency").notNull(),
  condition: text("condition").notNull(),
  availability: text("availability").notNull(),
  observedAt: text("observed_at").notNull(),
}, (table) => [
  uniqueIndex("price_observations_provider_offer_time_unique").on(table.providerId, table.offerId, table.observedAt),
  index("price_observations_variant_time_idx").on(table.variantId, table.observedAt),
  index("price_observations_product_variant_condition_time_idx").on(table.canonicalProductId, table.variantId, table.condition, table.observedAt),
]);

export const productIntelligenceSnapshots = sqliteTable("product_intelligence_snapshots", {
  cacheKey: text("cache_key").primaryKey(),
  canonicalProductId: text("canonical_product_id").notNull(),
  variantId: text("variant_id").notNull(),
  condition: text("condition").notNull(),
  market: text("market").notNull(),
  resultJson: text("result_json").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventName: text("event_name").notNull(),
  productSlug: text("product_slug"),
  variantId: text("variant_id"),
  condition: text("condition"),
  offerId: text("offer_id"),
  query: text("query"),
  offerCount: integer("offer_count"),
  occurredAt: text("occurred_at").notNull(),
}, (table) => [
  index("analytics_events_name_time_idx").on(table.eventName, table.occurredAt),
  index("analytics_events_product_time_idx").on(table.productSlug, table.occurredAt),
  index("analytics_events_offer_outcome_idx").on(table.eventName, table.offerCount, table.occurredAt),
]);
