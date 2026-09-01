import assert from "node:assert/strict";
import test from "node:test";
import { buildTargetReachedEmail, sendTargetReachedEmail } from "../services/transactional-email.ts";

const data = {
  productName: "iPhone 17 Pro",
  configuration: "256GB · New",
  trackedPrice: 899,
  currentPrice: 799,
  priceDrop: 100,
  imageUrl: "https://i.ebayimg.com/images/g/example/s-l500.jpg",
  comparisonHref: "/product/iphone-17-pro/iphone-17-pro-256gb/new",
};

test("target-reached emails can include a listing image when available", () => {
  const email = buildTargetReachedEmail({
    ...data,
    imageUrl: "https://i.ebayimg.com/images/g/example/s-l500.jpg",
  });
  assert.match(email.html, /i\.ebayimg\.com/);
});

test("target-reached email contains only exact persisted product and price facts", () => {
  const email = buildTargetReachedEmail(data);
  assert.match(email.subject, /iPhone 17 Pro/);
  assert.match(email.text, /256GB · New/);
  assert.match(email.text, /Tracked at: \$899/);
  assert.match(email.text, /Current best comparable price: \$799/);
  assert.match(email.text, /Price drop: \$100/);
  assert.equal(email.comparisonUrl, `https://kelus.me${data.comparisonHref}`);
  assert.match(email.html, /<img[^>]+i\.ebayimg\.com/);
  assert.doesNotMatch(email.text + email.html, /warranty|entire market|marketing/i);
});

test("target-reached email omits an unavailable or unsafe product image", () => {
  assert.doesNotMatch(buildTargetReachedEmail({ ...data, imageUrl: null }).html, /<img/);
  assert.doesNotMatch(buildTargetReachedEmail({ ...data, imageUrl: "javascript:alert(1)" }).html, /<img/);
});

test("Resend request uses a stable provider idempotency key", async () => {
  let request;
  const fetcher = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ id: "email-123" }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await sendTargetReachedEmail(
    { RESEND_API_KEY: "re_test", ALERT_EMAIL_FROM: "Kelus <alerts@updates.kelus.me>" },
    { to: "buyer@example.com", notificationId: "notification-123", data },
    fetcher,
  );
  assert.equal(result.providerMessageId, "email-123");
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.init.headers["Idempotency-Key"], "kelus-target-reached/notification-123");
  const body = JSON.parse(request.init.body);
  assert.deepEqual(body.to, ["buyer@example.com"]);
  assert.match(body.text, /View on Kelus/);
});

test("provider failures are surfaced without pretending an email was sent", async () => {
  await assert.rejects(
    sendTargetReachedEmail(
      { RESEND_API_KEY: "re_test", ALERT_EMAIL_FROM: "Kelus <alerts@updates.kelus.me>" },
      { to: "buyer@example.com", notificationId: "notification-123", data },
      async () => new Response(JSON.stringify({ message: "Domain is not verified" }), { status: 403, headers: { "Content-Type": "application/json" } }),
    ),
    /Domain is not verified/,
  );
});
