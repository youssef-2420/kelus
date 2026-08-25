"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { trackEvent } from "@/services/analytics";
import { alertId, createAlert, PRICE_ALERTS_CHANGED, readPriceAlerts, upsertPriceAlert, writePriceAlerts } from "@/services/price-alerts";
import { startSearch } from "@/services/search-session";
import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";

type Props = { product?: string; criteria: SearchCriteria; result?: OfferSearchResult | null };

export function WatchButton({ product = "iPhone 17", criteria, result }: Props) {
  const id = alertId(criteria);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => setSaved(readPriceAlerts().some((alert) => alert.id === id));
    sync();
    window.addEventListener(PRICE_ALERTS_CHANGED, sync);
    return () => window.removeEventListener(PRICE_ALERTS_CHANGED, sync);
  }, [id]);

  async function toggle() {
    setMessage("");
    if (saved) {
      writePriceAlerts(readPriceAlerts().filter((alert) => alert.id !== id));
      setSaved(false);
      return;
    }
    setChecking(true);
    try {
      const liveResult = result && !result.isDemo ? result : await startSearch(criteria);
      const alert = createAlert(criteria, liveResult);
      if (!alert) { setMessage("Live price unavailable"); return; }
      upsertPriceAlert(alert);
      setSaved(true);
      trackEvent({ name: "price_alert_created", product });
    } catch {
      setMessage("Couldn’t check price");
    } finally { setChecking(false); }
  }
  const label = checking ? "Checking price…" : message || (saved ? "Watching price" : "Track price");
  return <button className={saved ? "watch-button is-saved" : "watch-button"} type="button" disabled={checking} onClick={toggle}><Icon name={saved ? "check" : "bell"} size={16} />{label}</button>;
}
