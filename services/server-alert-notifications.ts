import type { SupabaseClient } from "@supabase/supabase-js";
import type { PriceAlertEvent } from "./alert-monitor.ts";
import { emailDeliveryConfigured, sendTargetReachedEmail, type TargetReachedEmailData, type TransactionalEmailEnvironment } from "./transactional-email.ts";

type ClaimedNotification = {
  notification_id: string;
  event_key: string;
  user_id: string;
  alert_id: string;
  event_data: PriceAlertEvent["data"];
};

async function queueTargetReachedNotifications(client: SupabaseClient, events: PriceAlertEvent[]) {
  const rows = events.filter((event) => event.type === "target_reached").map((event) => ({
    event_key: event.eventKey,
    user_id: event.userId,
    alert_id: event.alertId,
    provider: "resend",
    status: "pending",
  }));
  if (!rows.length) return 0;
  const { data, error } = await client.from("price_alert_notifications").upsert(rows, { onConflict: "event_key", ignoreDuplicates: true }).select("event_key");
  if (error) throw error;
  return data?.length ?? 0;
}

async function claimNotifications(client: SupabaseClient) {
  const { data, error } = await client.rpc("claim_price_alert_notifications", { p_limit: 50 });
  if (error) throw error;
  return (data ?? []) as ClaimedNotification[];
}

async function markSent(client: SupabaseClient, notification: ClaimedNotification, providerMessageId: string) {
  const { error } = await client.from("price_alert_notifications").update({
    status: "sent",
    sent_at: new Date().toISOString(),
    failed_at: null,
    error_message: null,
    provider_message_id: providerMessageId,
  }).eq("id", notification.notification_id).eq("status", "sending");
  if (error) throw error;
}

async function markFailed(client: SupabaseClient, notification: ClaimedNotification, message: string) {
  const { error } = await client.from("price_alert_notifications").update({
    status: "failed",
    failed_at: new Date().toISOString(),
    error_message: message.slice(0, 500),
  }).eq("id", notification.notification_id).eq("status", "sending");
  if (error) console.error("[alert-email] status_update_failed", { notificationId: notification.notification_id, message: error.message });
}

function emailData(event: PriceAlertEvent["data"]): TargetReachedEmailData | null {
  if (event.trackedPrice === null || event.currentPrice === null || event.priceDrop === null) return null;
  if (!event.comparisonHref.startsWith("/product/")) return null;
  return {
    productName: event.productName,
    configuration: event.configuration,
    trackedPrice: event.trackedPrice,
    currentPrice: event.currentPrice,
    priceDrop: event.priceDrop,
    comparisonHref: event.comparisonHref,
    imageUrl: event.imageUrl,
  };
}

export async function processTargetReachedNotifications(
  client: SupabaseClient,
  env: TransactionalEmailEnvironment,
  events: PriceAlertEvent[],
) {
  const queued = await queueTargetReachedNotifications(client, events);
  if (!emailDeliveryConfigured(env)) return { queued, sent: 0, failed: 0, configurationPending: true };
  const notifications = await claimNotifications(client);
  const emailByUser = new Map<string, string | null>();
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      const data = emailData(notification.event_data);
      if (!data) throw new Error("The target event does not contain complete real price data.");
      if (!emailByUser.has(notification.user_id)) {
        const { data: userData, error } = await client.auth.admin.getUserById(notification.user_id);
        emailByUser.set(notification.user_id, error ? null : userData.user?.email ?? null);
      }
      const email = emailByUser.get(notification.user_id);
      if (!email) throw new Error("The authenticated user does not have a deliverable email address.");
      const delivery = await sendTargetReachedEmail(env, { to: email, notificationId: notification.notification_id, data });
      await markSent(client, notification, delivery.providerMessageId);
      sent += 1;
    } catch (error) {
      failed += 1;
      await markFailed(client, notification, error instanceof Error ? error.message : "Email delivery failed.");
    }
  }
  return { queued, sent, failed, configurationPending: false };
}
