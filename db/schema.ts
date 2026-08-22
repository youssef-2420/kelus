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
]);
