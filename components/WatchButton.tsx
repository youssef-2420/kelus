"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { trackEvent } from "@/services/analytics";
import { getServerWatchlistSnapshot, readWatchedProducts, subscribeToWatchlist, writeWatchedProducts } from "@/lib/watchlist";

export function WatchButton({ product = "iPhone 17" }: { product?: string }) {
  const watchedProducts = useSyncExternalStore(subscribeToWatchlist, readWatchedProducts, getServerWatchlistSnapshot);
  const saved = watchedProducts.includes(product);

  function toggle() {
    const next = saved ? watchedProducts.filter((item) => item !== product) : [...watchedProducts, product];
    writeWatchedProducts(next);
    if (next.includes(product)) trackEvent({ name: "price_alert_created", product });
  }
  return <button className={saved ? "watch-button is-saved" : "watch-button"} type="button" onClick={toggle}><Icon name={saved ? "check" : "bell"} size={16} />{saved ? "Watching price" : "Track price"}</button>;
}
