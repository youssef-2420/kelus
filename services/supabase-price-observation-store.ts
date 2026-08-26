import { createClient } from "@supabase/supabase-js";
import type { ConditionFilter, PriceObservation } from "@/types/kelus";

export type SupabaseObservationEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
};

type ObservationRow = {
  id: number;
  offer_id: string;
  variant_id: string;
  provider_id: string;
  retailer_id: string;
  price_cents: number;
  shipping_cents: number | null;
  condition: PriceObservation["condition"];
  availability: PriceObservation["availability"];
  observed_at: string;
};

function observationClient(env: SupabaseObservationEnvironment) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function storeSupabasePriceObservations(env: SupabaseObservationEnvironment, canonicalProductId: string, observations: PriceObservation[]) {
  const client = observationClient(env);
  if (!client) return null;
  const rows = observations.filter((observation) => !observation.isDemo
    && observation.variantId
    && observation.providerId
    && observation.retailerId
    && observation.condition
    && observation.availability
    && Number.isFinite(observation.price)
    && !Number.isNaN(Date.parse(observation.timestamp)))
    .map((observation) => ({
      canonical_product_id: canonicalProductId,
      variant_id: observation.variantId!,
      provider_id: observation.providerId!,
      retailer_id: observation.retailerId!,
      offer_id: observation.offerId,
      price_cents: Math.round(observation.price * 100),
      shipping_cents: observation.shippingCost === null || observation.shippingCost === undefined ? null : Math.round(observation.shippingCost * 100),
      currency: "USD",
      condition: observation.condition!,
      availability: observation.availability!,
      observed_at: observation.timestamp,
    }));
  if (!rows.length) return 0;
  const { data, error } = await client.from("price_observations").upsert(rows, {
    onConflict: "provider_id,offer_id,observed_at",
    ignoreDuplicates: true,
  }).select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function readSupabasePriceObservations(env: SupabaseObservationEnvironment, canonicalProductId: string, variantId: string, condition: ConditionFilter, limit = 5_000): Promise<PriceObservation[] | null> {
  const client = observationClient(env);
  if (!client) return null;
  let query = client.from("price_observations")
    .select("id,offer_id,variant_id,provider_id,retailer_id,price_cents,shipping_cents,condition,availability,observed_at")
    .eq("canonical_product_id", canonicalProductId)
    .eq("variant_id", variantId)
    .order("observed_at", { ascending: false })
    .limit(Math.max(1, Math.min(Math.floor(limit), 10_000)));
  if (condition !== "any") query = query.eq("condition", condition);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ObservationRow[]).map((row) => ({
    id: `supabase-${row.id}`,
    offerId: row.offer_id,
    variantId: row.variant_id,
    providerId: row.provider_id,
    retailerId: row.retailer_id,
    price: row.price_cents / 100,
    shippingCost: row.shipping_cents === null ? null : row.shipping_cents / 100,
    condition: row.condition,
    availability: row.availability,
    timestamp: row.observed_at,
    isDemo: false,
  }));
}
