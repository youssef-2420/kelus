const WATCHLIST_KEY = "kelus-watched-products";

export function parseWatchedProducts(rawValue: string | null): string[] {
  try {
    const value: unknown = JSON.parse(rawValue ?? "[]");
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? [...new Set(value)]
      : [];
  } catch {
    return [];
  }
}

export function readWatchedProducts(): string[] {
  if (typeof window === "undefined") return [];
  return parseWatchedProducts(window.localStorage.getItem(WATCHLIST_KEY));
}

export function writeWatchedProducts(products: string[]): void {
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...new Set(products)]));
}
