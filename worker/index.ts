/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { getProductBySlug, getVariantById } from "../lib/demo-data";
import { getLiveOffersForSearch } from "../services/server-offer-service";
import { EbayProviderError } from "../services/providers/ebay/provider";
import type { ConditionFilter, SearchCriteria } from "../types/kelus";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  EBAY_CLIENT_ID?: string;
  EBAY_CLIENT_SECRET?: string;
  EBAY_MARKETPLACE_ID?: string;
  EBAY_CACHE_TTL_SECONDS?: string;
  EBAY_REQUEST_TIMEOUT_MS?: string;
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
    const url = new URL(request.url);

    if (url.pathname === "/api/offers") return handleOfferSearch(request, env);

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

    return handler.fetch(request, env, ctx);
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
    return json(await getLiveOffersForSearch(criteria, env), 200, "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
  } catch (error) {
    const providerError = error instanceof EbayProviderError ? error : null;
    const code = providerError?.code ?? (error instanceof Error && error.message.includes("not configured") ? "provider_unconfigured" : "provider_error");
    const status = code === "invalid_search" ? 400 : code === "rate_limited" ? 429 : 503;
    const message = code === "provider_unconfigured" ? "Live eBay offers are not configured yet." : providerError?.message ?? "We couldn't load eBay offers right now.";
    console.error("[ebay-provider] provider_error", { code, status: providerError?.status });
    return json({ error: { code, message } }, status);
  }
}

export default worker;
