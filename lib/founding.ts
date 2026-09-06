export function foundingPaymentLink() {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim() || "";
}

export function foundingPaymentConfigured() {
  return Boolean(foundingPaymentLink());
}
