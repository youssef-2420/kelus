import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PRICE_ALERTS_KEY, readPriceAlerts, type PriceAlertRecord } from "@/services/price-alerts";

type AlertRow = { id: string; user_id: string; alert_data: PriceAlertRecord };

async function authenticatedClient(expectedUserId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.user || data.session.user.id !== expectedUserId) throw new Error("Your session is no longer valid. Please sign in again.");
  return client;
}

export async function readUserAlerts(userId: string) {
  const client = await authenticatedClient(userId);
  const { data, error } = await client.from("price_alerts").select("id,user_id,alert_data").order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AlertRow[]).filter((row) => row.user_id === userId).map((row) => row.alert_data);
}

export async function upsertUserAlerts(userId: string, alerts: PriceAlertRecord[]) {
  if (!alerts.length) return;
  const client = await authenticatedClient(userId);
  const rows = alerts.map((alert) => ({ id: alert.id, user_id: userId, alert_data: alert, updated_at: new Date().toISOString() }));
  const { error } = await client.from("price_alerts").upsert(rows, { onConflict: "user_id,id" });
  if (error) throw error;
}

export async function deleteUserAlert(userId: string, alertId: string) {
  const client = await authenticatedClient(userId);
  const { error } = await client.from("price_alerts").delete().eq("user_id", userId).eq("id", alertId);
  if (error) throw error;
}

export async function refreshUserAlerts(userId: string) {
  const client = await authenticatedClient(userId);
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Your session is no longer valid. Please sign in again.");
  const response = await fetch("/api/alerts/check", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${data.session.access_token}` },
  });
  if (!response.ok) throw new Error("Tracked prices could not be checked right now.");
}

export async function migrateLocalAlerts(user: User) {
  const local = readPriceAlerts();
  if (!local.length) return;
  await upsertUserAlerts(user.id, local);
  window.localStorage.removeItem(PRICE_ALERTS_KEY);
}
