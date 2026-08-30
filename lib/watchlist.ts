const WATCHLIST_KEY = "kelus-watched-products";
const EMPTY_WATCHLIST: string[] = [];
const listeners = new Set<() => void>();
let cachedRawValue: string | null | undefined;
let cachedProducts: string[] = EMPTY_WATCHLIST;

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
  const rawValue = window.localStorage.getItem(WATCHLIST_KEY);
  if (rawValue !== cachedRawValue) {
    cachedRawValue = rawValue;
    cachedProducts = parseWatchedProducts(rawValue);
  }
  return cachedProducts;
}

export function writeWatchedProducts(products: string[]): void {
  cachedProducts = [...new Set(products)];
  cachedRawValue = JSON.stringify(cachedProducts);
  window.localStorage.setItem(WATCHLIST_KEY, cachedRawValue);
  listeners.forEach((listener) => listener());
}

export function subscribeToWatchlist(listener: () => void): () => void {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== WATCHLIST_KEY) return;
    cachedRawValue = undefined;
    listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getServerWatchlistSnapshot(): string[] {
  return EMPTY_WATCHLIST;
}
