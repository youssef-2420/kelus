import type { EbayProviderConfig } from "@/services/providers/ebay/config";
import type { EbayTokenResponse } from "@/services/providers/ebay/types";

type TokenCache = { key: string; token: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

export class EbayAuthError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "EbayAuthError";
    this.status = status;
  }
}

export function clearEbayTokenCache() {
  cachedToken = null;
}

async function credentialFingerprint(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 6), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getEbayApplicationToken(config: EbayProviderConfig, fetcher: typeof fetch = fetch, now = Date.now()) {
  const key = config.clientId + ":" + config.apiBaseUrl;
  if (cachedToken?.key === key && cachedToken.expiresAt > now) return cachedToken.token;

  const response = await fetcher(config.apiBaseUrl + "/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(config.clientId + ":" + config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    signal: AbortSignal.timeout(config.requestTimeoutMs),
  });
  if (!response.ok) {
    console.error("[ebay-auth] oauth_failed", {
      status: response.status,
      clientIdLength: config.clientId.length,
      clientIdFingerprint: await credentialFingerprint(config.clientId),
      clientSecretLength: config.clientSecret.length,
      clientSecretFingerprint: await credentialFingerprint(config.clientSecret),
    });
    throw new EbayAuthError("eBay authentication failed.", response.status);
  }

  let body: EbayTokenResponse;
  try {
    body = await response.json() as EbayTokenResponse;
  } catch {
    throw new EbayAuthError("eBay returned a malformed token response.", response.status);
  }
  if (!body.access_token || !Number.isFinite(body.expires_in) || Number(body.expires_in) <= 0) {
    throw new EbayAuthError("eBay returned an incomplete token response.", response.status);
  }
  cachedToken = {
    key,
    token: body.access_token,
    expiresAt: now + Number(body.expires_in) * 1000 - 60_000,
  };
  return body.access_token;
}
