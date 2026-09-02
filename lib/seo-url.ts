export const SITE_ORIGIN = "https://kelus.me";

export function absoluteCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}${normalizedPath.endsWith("/") ? normalizedPath : `${normalizedPath}/`}`;
}
