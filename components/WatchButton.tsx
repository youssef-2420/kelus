"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { SignInDialog } from "@/components/SignInDialog";
import { useAuth } from "@/components/AuthProvider";
import { trackEvent } from "@/services/analytics";
import { alertId, createAlert, createUnavailableAlert, PRICE_ALERTS_CHANGED, readPriceAlerts, upsertPriceAlert, writePriceAlerts } from "@/services/price-alerts";
import { startSearch } from "@/services/search-session";
import { deleteUserAlert, readUserAlerts, upsertUserAlerts } from "@/services/user-alerts";
import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";

type Props = { product?: string; criteria: SearchCriteria; result?: OfferSearchResult | null; allowUnavailable?: boolean };

export function WatchButton({ product = "iPhone 17", criteria, result, allowUnavailable = false }: Props) {
  const { user } = useAuth();
  const id = alertId(criteria);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const sync = () => {
      if (user) readUserAlerts(user.id).then((alerts) => { if (active) setSaved(alerts.some((alert) => alert.id === id)); }).catch(() => undefined);
      else setSaved(readPriceAlerts().some((alert) => alert.id === id));
    };
    sync();
    window.addEventListener(PRICE_ALERTS_CHANGED, sync);
    return () => { active = false; window.removeEventListener(PRICE_ALERTS_CHANGED, sync); };
  }, [id, user]);

  async function toggle() {
    setMessage("");
    if (saved) {
      if (user) await deleteUserAlert(user.id, id);
      else writePriceAlerts(readPriceAlerts().filter((alert) => alert.id !== id));
      setSaved(false);
      return;
    }
    setChecking(true);
    try {
      const liveResult = result && !result.isDemo ? result : await startSearch(criteria);
      const alert = createAlert(criteria, liveResult) ?? (allowUnavailable ? createUnavailableAlert(criteria) : null);
      if (!alert) { setMessage("Live price unavailable"); return; }
      if (user) await upsertUserAlerts(user.id, [alert]);
      else upsertPriceAlert(alert);
      setSaved(true);
      trackEvent({ name: "price_alert_created", product, productSlug: criteria.productSlug, variantId: criteria.variantId, condition: criteria.condition });
    } catch {
      setMessage("Couldn’t check price");
    } finally { setChecking(false); }
  }
  const label = checking ? "Checking price…" : message || (saved ? (allowUnavailable ? "Tracking availability" : "Watching price") : (allowUnavailable ? "Track availability" : "Track price"));
  return <div className={`watch-button-wrap${saved ? " is-saved" : ""}`}>
    <button className={saved ? "watch-button is-saved" : "watch-button"} type="button" disabled={checking} onClick={toggle} aria-live="polite"><Icon name={saved ? "check" : "bell"} size={16} />{label}</button>
    {message ? <p className="watch-button-message" role="alert">{message}</p> : null}
    {saved && !user && !message ? <div className="watch-button-note">Saved on this device. <SignInDialog label="Sign in for email alerts" className="watch-button-signin"/></div> : null}
  </div>;
}
