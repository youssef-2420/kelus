export function foundingPaymentLink() {
  return process.env.NEXT_PUBLIC_EXAM_PASS_PAYMENT_LINK?.trim() || "";
}

export function foundingPaymentConfigured() {
  return Boolean(foundingPaymentLink());
}
