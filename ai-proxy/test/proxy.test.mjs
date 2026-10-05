import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { LIMITS, handle, resetLimits } from "../index.mjs";

const env = { ANTHROPIC_API_KEY: "test-key-not-real", ALLOWED_ORIGINS: "https://kelus.me", PER_IP_PER_HOUR: "3", DAILY_CAP: "100" };

function call(body, { origin = "https://kelus.me", method = "POST", ip = "1.1.1.1" } = {}) {
  return new Request("https://proxy.example/", { method, headers: { origin, "content-type": "application/json", "cf-connecting-ip": ip }, body: method === "POST" ? JSON.stringify(body) : undefined });
}

function fakeClient(result) {
  const calls = [];
  return {
    calls,
    beta: { messages: { create: async (params) => { calls.push(params); if (result instanceof Error) throw result; return result; } } },
  };
}

const ok = { stop_reason: "end_turn", content: [{ type: "text", text: '{"explanation":"x","items":[]}' }] };

beforeEach(() => resetLimits());

test("a request from the allowed site gets the model's text", async () => {
  const client = fakeClient(ok);
  const res = await handle(call({ system: "s", user: "u" }), env, { client });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { text: '{"explanation":"x","items":[]}' });
  assert.equal(res.headers.get("access-control-allow-origin"), "https://kelus.me");
  assert.equal(client.calls[0].model, "claude-opus-5-5");
  assert.equal(client.calls[0].output_config.effort, "low");
  assert.ok(client.calls[0].max_tokens <= LIMITS.maxOutputTokens);
});

test("the key and the page text never appear in a reply", async () => {
  const res = await handle(call({ system: "secret system", user: "secret page text" }), env, { client: fakeClient(new Error("upstream said secret page text and test-key-not-real")) });
  const text = await res.text();
  assert.equal(res.status, 502);
  assert.doesNotMatch(text, /secret page text|test-key-not-real/);
});

test("other sites are refused, with no CORS grant", async () => {
  const res = await handle(call({ system: "s", user: "u" }, { origin: "https://evil.example" }), env, { client: fakeClient(ok) });
  assert.equal(res.status, 403);
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("a preflight from the allowed site succeeds and others get no permission", async () => {
  const good = await handle(call(null, { method: "OPTIONS" }), env, { client: fakeClient(ok) });
  assert.equal(good.status, 204);
  assert.equal(good.headers.get("access-control-allow-origin"), "https://kelus.me");
  const bad = await handle(call(null, { method: "OPTIONS", origin: "https://evil.example" }), env, { client: fakeClient(ok) });
  assert.equal(bad.headers.get("access-control-allow-origin"), null);
});

test("oversized, empty and non-JSON requests are rejected before the model is called", async () => {
  const client = fakeClient(ok);
  assert.equal((await handle(call({ system: "s", user: "x".repeat(LIMITS.maxUserChars + 1) }), env, { client })).status, 413);
  assert.equal((await handle(call({ system: "", user: "u" }), env, { client })).status, 400);
  const notJson = new Request("https://proxy.example/", { method: "POST", headers: { origin: "https://kelus.me" }, body: "not json" });
  assert.equal((await handle(notJson, env, { client })).status, 400);
  assert.equal(client.calls.length, 0);
});

test("a visitor is limited per hour and the daily cap applies to everyone", async () => {
  const client = fakeClient(ok);
  for (let i = 0; i < 3; i += 1) assert.equal((await handle(call({ system: "s", user: "u" }), env, { client })).status, 200);
  assert.equal((await handle(call({ system: "s", user: "u" }), env, { client })).status, 429);
  assert.equal((await handle(call({ system: "s", user: "u" }, { ip: "2.2.2.2" }), env, { client })).status, 200);
  resetLimits();
  const tight = { ...env, DAILY_CAP: "1", PER_IP_PER_HOUR: "50" };
  assert.equal((await handle(call({ system: "s", user: "u" }, { ip: "3.3.3.3" }), tight, { client })).status, 200);
  assert.equal((await handle(call({ system: "s", user: "u" }, { ip: "4.4.4.4" }), tight, { client })).status, 429);
});

test("refusals, cut-off answers and empty answers are not passed on as content", async () => {
  assert.equal((await handle(call({ system: "s", user: "u" }), env, { client: fakeClient({ stop_reason: "refusal", content: [] }) })).status, 422);
  resetLimits();
  assert.equal((await handle(call({ system: "s", user: "u" }), env, { client: fakeClient({ stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] }) })).status, 502);
  resetLimits();
  assert.equal((await handle(call({ system: "s", user: "u" }), env, { client: fakeClient({ stop_reason: "end_turn", content: [] }) })).status, 502);
});

test("without a key the service says it is not configured", async () => {
  const res = await handle(call({ system: "s", user: "u" }), { ALLOWED_ORIGINS: "https://kelus.me" });
  assert.equal(res.status, 503);
});

test("the model and fallback are settings, not code", async () => {
  const client = fakeClient(ok);
  await handle(call({ system: "s", user: "u" }), { ...env, AI_MODEL: "claude-haiku-4-5", AI_FALLBACK: "off" }, { client });
  assert.equal(client.calls[0].model, "claude-haiku-4-5");
  assert.equal(client.calls[0].fallbacks, undefined);
});
