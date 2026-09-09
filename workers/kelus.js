/**
 * Cloudflare Worker: static assets + Exam Pass entitlement API.
 * Entitlement is an HttpOnly cookie — not a forgeable ?pass=1 localStorage flag.
 */
const COOKIE = "kelus_exam_pass";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig));
}

async function hmacVerify(secret, message, signature) {
  const expected = await hmacSign(secret, message);
  return expected === signature;
}

export async function mintExamPassCookieValue(secret, payload) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

export async function readExamPassCookieValue(secret, raw) {
  if (!raw || !secret) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  if (!(await hmacVerify(secret, body, sig))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload || typeof payload.at !== "string") return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function setExamPassCookie(value) {
  const secure = "; Secure";
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

function clearExamPassCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

function founderCodes(env) {
  return String(env.EXAM_PASS_CODES || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

async function verifyStripeSession(env, sessionId) {
  if (!env.STRIPE_SECRET_KEY || !sessionId) return null;
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  const session = await res.json();
  if (session.payment_status !== "paid" && session.status !== "complete") return null;
  return {
    at: new Date().toISOString(),
    exp: Date.now() + MAX_AGE * 1000,
    email: session.customer_details?.email || session.customer_email || null,
    stripeSessionId: session.id,
    method: "stripe_session",
  };
}

async function redeem(request, env) {
  if (!env.EXAM_PASS_SIGNING_SECRET) {
    return json({ ok: false, error: "Exam Pass redeem is not configured on this deploy." }, { status: 503 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Expected JSON body." }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  let payload = null;

  if (sessionId) {
    payload = await verifyStripeSession(env, sessionId);
    if (!payload) {
      return json({ ok: false, error: "Could not verify that Stripe checkout." }, { status: 402 });
    }
  } else if (code && founderCodes(env).includes(code)) {
    payload = {
      at: new Date().toISOString(),
      exp: Date.now() + MAX_AGE * 1000,
      email: email || null,
      method: "redeem_code",
      codeHash: code.slice(0, 4) + "…",
    };
  } else if (code || sessionId) {
    return json({ ok: false, error: "That code or checkout could not be verified." }, { status: 402 });
  } else {
    return json({ ok: false, error: "Provide a Stripe session id or redeem code." }, { status: 400 });
  }

  const value = await mintExamPassCookieValue(env.EXAM_PASS_SIGNING_SECRET, payload);
  return json(
    { ok: true, at: payload.at, method: payload.method, email: payload.email },
    { status: 200, headers: { "set-cookie": setExamPassCookie(value) } },
  );
}

async function status(request, env) {
  if (!env.EXAM_PASS_SIGNING_SECRET) {
    return json({ active: false, configured: false });
  }
  const cookies = parseCookies(request.headers.get("cookie"));
  const payload = await readExamPassCookieValue(env.EXAM_PASS_SIGNING_SECRET, cookies[COOKIE]);
  return json({
    active: Boolean(payload),
    configured: true,
    at: payload?.at ?? null,
    method: payload?.method ?? null,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/exam-pass/status" && request.method === "GET") {
      return status(request, env);
    }
    if (url.pathname === "/api/exam-pass/redeem" && request.method === "POST") {
      return redeem(request, env);
    }
    if (url.pathname === "/api/exam-pass/clear" && request.method === "POST") {
      return json({ ok: true }, { headers: { "set-cookie": clearExamPassCookie() } });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Kelus worker missing ASSETS binding", { status: 500 });
  },
};
