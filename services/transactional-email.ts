export type TransactionalEmailEnvironment = {
  RESEND_API_KEY?: string;
  ALERT_EMAIL_FROM?: string;
};

export type TargetReachedEmailData = {
  productName: string;
  configuration: string;
  trackedPrice: number;
  currentPrice: number;
  priceDrop: number;
  comparisonHref: string;
};

type ResendResponse = { id?: string; message?: string; name?: string };

const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);

export function emailDeliveryConfigured(env: TransactionalEmailEnvironment) {
  return Boolean(env.RESEND_API_KEY?.trim() && env.ALERT_EMAIL_FROM?.trim());
}

export function buildTargetReachedEmail(data: TargetReachedEmailData) {
  const product = escapeHtml(data.productName);
  const configuration = escapeHtml(data.configuration);
  const comparisonUrl = new URL(data.comparisonHref, "https://kelus.me").toString();
  const subject = `Target reached: ${data.productName}`;
  const text = [
    `Your Kelus target price has been reached for ${data.productName} · ${data.configuration}.`,
    `Tracked at: ${money(data.trackedPrice)}`,
    `Current best comparable price: ${money(data.currentPrice)}`,
    `Price drop: ${money(data.priceDrop)}`,
    `View on Kelus: ${comparisonUrl}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#102c27;line-height:1.5;max-width:560px;margin:auto">
    <p style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#0d6b5d">Target reached</p>
    <h1 style="font-size:28px;margin:0 0 8px">${product}</h1>
    <p style="color:#5f6f6b;margin:0 0 24px">${configuration}</p>
    <p>Tracked at: <strong>${money(data.trackedPrice)}</strong><br>Current best comparable price: <strong>${money(data.currentPrice)}</strong><br>Price drop: <strong>${money(data.priceDrop)}</strong></p>
    <p style="margin-top:28px"><a href="${comparisonUrl}" style="display:inline-block;background:#0b5147;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px">View on Kelus →</a></p>
    <p style="font-size:12px;color:#7b8885;margin-top:28px">This transactional email was sent because you created a Kelus price alert.</p>
  </div>`;
  return { subject, text, html, comparisonUrl };
}

export async function sendTargetReachedEmail(
  env: TransactionalEmailEnvironment,
  input: { to: string; notificationId: string; data: TargetReachedEmailData },
  fetcher: typeof fetch = fetch,
) {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.ALERT_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Transactional email is not configured.");
  const email = buildTargetReachedEmail(input.data);
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `kelus-target-reached/${input.notificationId}`,
    },
    body: JSON.stringify({ from, to: [input.to], subject: email.subject, text: email.text, html: email.html }),
  });
  const payload = await response.json().catch(() => ({})) as ResendResponse;
  if (!response.ok || !payload.id) throw new Error(payload.message || `Resend rejected the email with status ${response.status}.`);
  return { providerMessageId: payload.id };
}
