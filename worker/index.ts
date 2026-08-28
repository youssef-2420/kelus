/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { getProductBySlug, getVariantById } from "../lib/demo-data";
import { getLiveOffersForSearch } from "../services/server-offer-service";
import { EbayProviderError } from "../services/providers/ebay/provider";
import { authorizeAlertMonitor, runAlertMonitor } from "../services/server-alert-monitor";
import { refreshPersistedProductIntelligenceSnapshots } from "../services/server-product-snapshot-refresh";
import { setKelusRuntimeEnvironment } from "../services/runtime-environment";
import { applyCanonicalProductResponsePolicy, applyRootResponsePolicy, canonicalHostRedirect } from "../services/product-response-policy";
import type { ConditionFilter, SearchCriteria } from "../types/kelus";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_MARKETPLACE_ID?: string;
  EBAY_CACHE_TTL_SECONDS?: string;
  EBAY_REQUEST_TIMEOUT_MS?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  ALERT_MONITOR_SECRET?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setKelusRuntimeEnvironment(env);
    const url = new URL(request.url);
    const hostRedirect = canonicalHostRedirect(request.url);
    if (hostRedirect) return hostRedirect;

    if (url.pathname === "/api/offers") return handleOfferSearch(request, env);
    if (url.pathname === "/api/alerts/check") return handleAlertCheck(request, env, ctx);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const renderStartedAt = Date.now();
    const response = await handler.fetch(request, env, ctx);
    if (url.pathname.startsWith("/product/")) {
      console.info("[product-intelligence] response_rendered", {
        durationMs: Date.now() - renderStartedAt,
        status: response.status,
      });
    }
    return applyRootResponsePolicy(url.pathname, applyCanonicalProductResponsePolicy(url.pathname, response));
  },
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.allSettled([
      runAlertMonitor(env).then((result) => console.info("[alert-monitor] scheduled_complete", result)).catch((error) => {
        console.error("[alert-monitor] scheduled_failed", { message: error instanceof Error ? error.message : "Unknown error" });
      }),
      refreshPersistedProductIntelligenceSnapshots(env, fetch, Date.now(), getLiveOffersForSearch).then((result) => console.info("[product-intelligence] scheduled_refresh_complete", result)).catch((error) => {
        console.error("[product-intelligence] scheduled_refresh_failed", { message: error instanceof Error ? error.message : "Unknown error" });
      }),
    ]).then(() => undefined));
  },
};

const conditions: ConditionFilter[] = ["any", "new", "used", "refurbished"];

function json(body: unknown, status = 200, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

function criteriaFrom(url: URL): SearchCriteria | null {
  const productSlug = url.searchParams.get("product");
  const variantId = url.searchParams.get("variant");
  const condition = url.searchParams.get("condition") as ConditionFilter | null;
  const market = url.searchParams.get("market");
  const product = productSlug ? getProductBySlug(productSlug) : undefined;
  const variant = variantId ? getVariantById(variantId) : undefined;
  if (!product || !variant || variant.productId !== product.id || !condition || !conditions.includes(condition) || market !== "us") return null;
  return { productSlug: product.slug, variantId: variant.id, condition, market: "us" };
}

async function handleOfferSearch(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: { code: "method_not_allowed", message: "Only GET is supported." } }, 405);
  const criteria = criteriaFrom(new URL(request.url));
  if (!criteria) return json({ error: { code: "invalid_search", message: "Choose a supported iPhone model, storage, condition, and the United States market." } }, 400);
  try {
    return json(await getLiveOffersForSearch(criteria, env, fetch, { allowStaleFallback: true }), 200, "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  } catch (error) {
    const providerError = error instanceof EbayProviderError ? error : null;
    const code = providerError?.code ?? (error instanceof Error && error.message.includes("not configured") ? "provider_unconfigured" : "provider_error");
    const status = code === "invalid_search" ? 400 : code === "rate_limited" ? 429 : 503;
    const message = code === "provider_unconfigured" ? "Live eBay offers are not configured yet." : providerError?.message ?? "We couldn't load eBay offers right now.";
    console.error("[ebay-provider] provider_error", { code, status: providerError?.status });
    return json({ error: { code, message } }, status);
  }
}

async function handleAlertCheck(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "POST") return json({ error: { code: "method_not_allowed", message: "Only POST is supported." } }, 405);
  try {
    const scope = await authorizeAlertMonitor(request, env);
    if (!scope) return json({ error: { code: "unauthorized", message: "A valid Kelus session is required." } }, 401);
    const result = await runAlertMonitor(env, scope);
    ctx.waitUntil(refreshPersistedProductIntelligenceSnapshots(env, fetch, Date.now(), getLiveOffersForSearch)
      .then((summary) => console.info("[product-intelligence] monitor_refresh_complete", summary))
      .catch((error) => console.error("[product-intelligence] monitor_refresh_failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      })));
    return json(result);
  } catch (error) {
    console.error("[alert-monitor] check_failed", { message: error instanceof Error ? error.message : "Unknown error" });
    return json({ error: { code: "monitor_error", message: "Tracked prices could not be checked right now." } }, 503);
  }
}

export default worker;
