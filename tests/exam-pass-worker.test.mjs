import assert from "node:assert/strict";
import test from "node:test";
import { mintExamPassCookieValue, readExamPassCookieValue } from "../workers/kelus.js";

test("exam pass cookie payloads are HMAC-signed and reject tampering", async () => {
  const secret = "test-signing-secret-not-for-prod";
  const payload = { at: "2026-09-09T12:00:00.000Z", method: "redeem_code", exp: Date.now() + 60_000 };
  const raw = await mintExamPassCookieValue(secret, payload);
  const ok = await readExamPassCookieValue(secret, raw);
  assert.equal(ok?.at, payload.at);
  assert.equal(ok?.method, "redeem_code");

  const [body] = raw.split(".");
  const tampered = `${body}.deadbeef`;
  assert.equal(await readExamPassCookieValue(secret, tampered), null);
  assert.equal(await readExamPassCookieValue("other-secret", raw), null);
});
