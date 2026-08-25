import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SearchCriteria } from "@/types/kelus";
import type { PriceAlertRecord } from "@/services/price-alerts";
import { monitorAlertRecords, type OwnedPriceAlert } from "@/services/alert-monitor";
import { getLiveOffersForSearch } from "@/services/server-offer-service";
import type { ObservationDatabase } from "@/services/price-observation-store";
import type { EbayEnvironment } from "@/services/providers/ebay/config";

type MonitorEnvironment = EbayEnvironment & {
  DB?: ObservationDatabase;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  ALERT_MONITOR_SECRET?: string;
};

type AlertRow = { user_id: string; id: string; alert_data: PriceAlertRecord };
type MonitorScope = { userId?: string };

function serviceClient(env: MonitorEnvironment) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("The server alert monitor is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function bearerToken(request: Request) {
  const value = request.headers.get("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export async function authorizeAlertMonitor(request: Request, env: MonitorEnvironment): Promise<MonitorScope | null> {
  const token = bearerToken(request);
  if (!token) return null;
  if (env.ALERT_MONITOR_SECRET && safeEqual(token, env.ALERT_MONITOR_SECRET)) return {};
  const client = serviceClient(env);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id };
}

async function readActiveAlerts(client: SupabaseClient, scope: MonitorScope) {
  let query = client.from("price_alerts").select("user_id,id,alert_data").order("updated_at", { ascending: true }).limit(5000);
  if (scope.userId) query = query.eq("user_id", scope.userId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as AlertRow[])
    .filter((row) => row.alert_data && row.id === row.alert_data.id && row.alert_data.criteria?.market === "us")
    .map((row): OwnedPriceAlert => ({ userId: row.user_id, alert: row.alert_data }));
}

async function persistUpdates(client: SupabaseClient, records: OwnedPriceAlert[]) {
  if (!records.length) return;
  const rows = records.map(({ userId, alert }) => ({ user_id: userId, id: alert.id, alert_data: alert, updated_at: new Date().toISOString() }));
  const { error } = await client.from("price_alerts").upsert(rows, { onConflict: "user_id,id" });
  if (error) throw error;
}

async function persistEvents(client: SupabaseClient, events: Awaited<ReturnType<typeof monitorAlertRecords>>["events"]) {
  if (!events.length) return;
  const rows = events.map((event) => ({
    event_key: event.eventKey,
    user_id: event.userId,
    alert_id: event.alertId,
    event_type: event.type,
    event_data: event.data,
    occurred_at: event.occurredAt,
  }));
  const { error } = await client.from("price_alert_events").upsert(rows, { onConflict: "event_key", ignoreDuplicates: true });
  if (error) throw error;
}

export async function runAlertMonitor(env: MonitorEnvironment, scope: MonitorScope = {}) {
  const client = serviceClient(env);
  const records = await readActiveAlerts(client, scope);
  const result = await monitorAlertRecords(records, (criteria: SearchCriteria) => getLiveOffersForSearch(criteria, env));
  await persistUpdates(client, result.updates);
  await persistEvents(client, result.events);
  return {
    checkedAlerts: result.updates.length,
    searchedConfigurations: result.searchedConfigurations,
    failedConfigurations: result.failedConfigurations,
    queuedEvents: result.events.length,
  };
}

export type { MonitorEnvironment };
