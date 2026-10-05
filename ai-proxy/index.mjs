import Anthropic from "@anthropic-ai/sdk";

/**
 * Kelus AI proxy. The only place the Anthropic key lives.
 *
 * Receives { system, user } built by the app (a topic's page text and instructions) and returns { text }.
 * It does not store or log page text. Deploy as a Cloudflare Worker, or call `handle` from any fetch-style host.
 *
 * Environment:
 *   ANTHROPIC_API_KEY   required, set as a secret, never in the repo
 *   ALLOWED_ORIGINS     comma-separated origins allowed to call it (default https://kelus.me)
 *   AI_MODEL            model id (default claude-opus-5-5)
 *   AI_EFFORT           low | medium | high (default low: this is a short, structured task)
 *   AI_FALLBACK         "off" to skip the server-side refusal fallback (default on)
 *   PER_IP_PER_HOUR     requests per visitor per hour (default 30)
 *   DAILY_CAP           requests per day across everyone (default 500)
 */

export const LIMITS = { maxSystemChars: 2_000, maxUserChars: 12_000, maxOutputTokens: 2_500 };
const DEFAULTS = { model: "claude-opus-5-5", effort: "low", perIpPerHour: 30, dailyCap: 500, origin: "https://kelus.me" };

// Best-effort counters. They reset when the worker restarts, so treat them as a brake, not a bill.
// For a hard limit, set a spending cap in the Anthropic Console, which is the real ceiling.
const hits = new Map();
let day = { key: "", count: 0 };

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? DEFAULTS.origin).split(",").map((value) => value.trim()).filter(Boolean);
}

function cors(origin, env) {
  const ok = origin && allowedOrigins(env).includes(origin);
  return ok
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", vary: "origin" }
    : { vary: "origin" };
}

function reply(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

function overLimit(ip, env, now = Date.now()) {
  const dayKey = new Date(now).toISOString().slice(0, 10);
  if (day.key !== dayKey) day = { key: dayKey, count: 0 };
  if (day.count >= Number(env.DAILY_CAP ?? DEFAULTS.dailyCap)) return "daily";
  const hour = Math.floor(now / 3_600_000);
  const key = `${ip}:${hour}`;
  const used = hits.get(key) ?? 0;
  if (used >= Number(env.PER_IP_PER_HOUR ?? DEFAULTS.perIpPerHour)) return "visitor";
  if (hits.size > 5_000) for (const stale of hits.keys()) if (!stale.endsWith(`:${hour}`)) hits.delete(stale);
  hits.set(key, used + 1);
  day.count += 1;
  return null;
}

export function resetLimits() {
  hits.clear();
  day = { key: "", count: 0 };
}

/** @param {Request} request @param {Record<string, string>} env @param {{ client?: any }} [deps] */
export async function handle(request, env, deps = {}) {
  const origin = request.headers.get("origin") ?? "";
  const headers = cors(origin, env);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Use POST." }, headers);
  if (!allowedOrigins(env).includes(origin)) return reply(403, { error: "This site is not allowed to use the service." }, headers);
  if (!env.ANTHROPIC_API_KEY && !deps.client) return reply(503, { error: "The service is not configured." }, headers);

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: "Send JSON." }, headers);
  }
  const system = typeof body?.system === "string" ? body.system : "";
  const user = typeof body?.user === "string" ? body.user : "";
  if (!system || !user) return reply(400, { error: "system and user are required." }, headers);
  if (system.length > LIMITS.maxSystemChars || user.length > LIMITS.maxUserChars) return reply(413, { error: "That is too long." }, headers);

  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = overLimit(ip, env);
  if (limited) return reply(429, { error: limited === "daily" ? "The daily limit has been reached. Try again tomorrow." : "Too many requests. Try again in an hour." }, headers);

  const client = deps.client ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 45_000 });
  const params = {
    model: env.AI_MODEL || DEFAULTS.model,
    max_tokens: LIMITS.maxOutputTokens,
    output_config: { effort: env.AI_EFFORT || DEFAULTS.effort },
    system,
    messages: [{ role: "user", content: user }],
  };
  if (env.AI_FALLBACK !== "off") {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }

  try {
    const response = await client.beta.messages.create(params);
    if (response.stop_reason === "refusal") return reply(422, { error: "The model declined this request." }, headers);
    if (response.stop_reason === "max_tokens") return reply(502, { error: "The answer was cut off." }, headers);
    const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
    if (!text.trim()) return reply(502, { error: "Empty answer." }, headers);
    return reply(200, { text }, headers);
  } catch (error) {
    // Never echo upstream details or the request back to the browser.
    const status = error instanceof Anthropic.RateLimitError ? 503 : 502;
    return reply(status, { error: "The question writer is unavailable right now." }, headers);
  }
}

export default { fetch: (request, env) => handle(request, env) };
