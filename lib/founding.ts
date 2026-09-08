const STRIPE_PAYMENT_HOST = "buy.stripe.com";

export function foundingPaymentLink(raw = process.env.NEXT_PUBLIC_EXAM_PASS_PAYMENT_LINK) {
  const value = raw?.trim() || "";
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== STRIPE_PAYMENT_HOST) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function foundingPaymentConfigured() {
  return Boolean(foundingPaymentLink());
}
