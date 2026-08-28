const CANONICAL_HOST = "kelus.me";

export function canonicalHostRedirect(requestUrl: string) {
  const url = new URL(requestUrl);
  if (url.hostname.toLowerCase() !== `www.${CANONICAL_HOST}`) return null;
  url.hostname = CANONICAL_HOST;
  url.port = "";
  return new Response(null, {
    status: 308,
    headers: {
      Location: url.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function applyCanonicalProductResponsePolicy(pathname: string, response: Response) {
  if (!pathname.startsWith("/product/")) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function applyRootResponsePolicy(pathname: string, response: Response) {
  if (pathname !== "/" || response.status !== 200 || !response.headers.get("Content-Type")?.includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  headers.set("CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=86400, stale-if-error=86400");
  headers.set("Cloudflare-CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=86400, stale-if-error=86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
