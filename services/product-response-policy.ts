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
