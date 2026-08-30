"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { trackEvent } from "@/services/analytics";
import { readWatchedProducts, writeWatchedProducts } from "@/lib/watchlist";

export function WatchButton({ product = "iPhone 17" }: { product?: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(readWatchedProducts().includes(product));
  }, [product]);

  function toggle() {
    const current = readWatchedProducts();
    const next = current.includes(product) ? current.filter((item) => item !== product) : [...current, product];
    writeWatchedProducts(next);
    setSaved(next.includes(product));
    if (next.includes(product)) trackEvent({ name: "price_alert_created", product });
  }
  return <button className={saved ? "watch-button is-saved" : "watch-button"} type="button" onClick={toggle}><Icon name={saved ? "check" : "bell"} size={16} />{saved ? "Watching price" : "Track price"}</button>;
}
