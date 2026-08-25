"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import { SafeLink as Link } from "@/components/SafeLink";
import { comparisonHref, getAlertStatus, getDistanceFromTarget, getPriceChange, isAlertStale, type PriceAlertRecord, readPriceAlerts, updateAlertFromError, updateAlertFromResult, writePriceAlerts } from "@/services/price-alerts";
import { retrySearch } from "@/services/search-session";

const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;

function timeLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not checked yet";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "Updated now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  if (minutes < 1_440) return `Updated ${Math.floor(minutes / 60)}h ago`;
  return `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value))}`;
}

function statusLabel(alert: PriceAlertRecord) {
  const status = getAlertStatus(alert);
  return status === "target_reached" ? "Target reached" : status === "price_dropped" ? "Price dropped" : status === "paused" ? "Paused" : "Watching";
}

function contextLabel(alert: PriceAlertRecord) {
  if (alert.state === "unavailable") return "No matching live offer is available right now.";
  if (alert.state === "error") return alert.errorMessage || "The latest price check failed.";
  if (new Date(alert.startedAt).toDateString() === new Date().toDateString()) return "Tracking started today";
  const change = getPriceChange(alert);
  return !change || change.amount === 0 ? "No verified price change yet" : "Compared with the first tracked live price";
}

function AlertImage({ alert }: { alert: PriceAlertRecord }) {
  const [failed, setFailed] = useState(false);
  return <span className="alert-image">{alert.imageUrl?.startsWith("https://") && !failed ? <img src={alert.imageUrl} alt="" onError={() => setFailed(true)}/> : <ProductMark label={alert.imageLabel} small/>}</span>;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlertRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  useEffect(() => {
    let cancelled = false;
    const stored = readPriceAlerts();
    queueMicrotask(() => {
      if (cancelled) return;
      setAlerts(stored); setExpanded(stored[0]?.id ?? null); setReady(true);
      setRefreshing(new Set(stored.filter((alert) => !alert.paused).map((alert) => alert.id)));
    });
    Promise.all(stored.map(async (alert) => {
      if (alert.paused) return alert;
      try { return updateAlertFromResult(alert, await retrySearch(alert.criteria)); }
      catch (error) { return updateAlertFromError(alert, error instanceof Error ? error.message : "The latest price check failed."); }
    })).then((updated) => {
      if (cancelled) return;
      setAlerts(updated); writePriceAlerts(updated); setRefreshing(new Set());
    });
    return () => { cancelled = true; };
  }, []);

  function persist(next: PriceAlertRecord[]) { setAlerts(next); writePriceAlerts(next); }
  function togglePause(alert: PriceAlertRecord) { persist(alerts.map((item) => item.id === alert.id ? { ...item, paused: !item.paused } : item)); }
  function removeAlert(alert: PriceAlertRecord) {
    const next = alerts.filter((item) => item.id !== alert.id); persist(next);
    if (expanded === alert.id) setExpanded(next[0]?.id ?? null);
  }
  function beginEdit(alert: PriceAlertRecord) { setEditing(alert.id); setTarget(alert.targetPrice?.toString() ?? ""); }
  function saveTarget(event: FormEvent, alert: PriceAlertRecord) {
    event.preventDefault();
    const parsed = target.trim() ? Number(target) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
    persist(alerts.map((item) => item.id === alert.id ? { ...item, targetPrice: parsed === null ? null : Math.round(parsed * 100) / 100 } : item));
    setEditing(null);
  }

  return <main className="app-page alerts-page"><KelusHeader />
    <section className="alerts-main section">
      <div className="alerts-heading"><div><p className="eyebrow">Your price alerts</p><h1>My Alerts</h1><p>Track products you want and know when the price is worth buying.</p></div><Link href="/#product-search" className="alerts-add" aria-label="Add a new product">+</Link></div>
      {!ready ? <div className="alerts-empty" role="status"><Icon name="refresh" size={28}/><h2>Loading your alerts…</h2></div> : alerts.length ? <div className="alerts-list">
        {alerts.map((alert) => {
          const open = expanded === alert.id;
          const status = getAlertStatus(alert);
          const change = getPriceChange(alert);
          const distance = getDistanceFromTarget(alert);
          const stale = isAlertStale(alert);
          return <article className={`alert-row${alert.paused ? " is-paused" : ""}${open ? " is-open" : ""}`} key={alert.id}>
            <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : alert.id)}>
              <span className="alert-product"><AlertImage alert={alert}/><span><b>{alert.productName}</b><small>{alert.configuration}</small></span></span>
              <span className={`alert-status is-${status}`}>{statusLabel(alert)}</span>
              {change && change.amount !== 0 ? <span className={`alert-change${change.amount > 0 ? " is-up" : ""}`}>{change.amount > 0 ? "↑" : "↓"} {money(Math.abs(change.amount))} ({Math.abs(change.percent)}%)</span> : <span className="alert-change is-neutral">No change</span>}
              <strong>{alert.currentPrice === null ? "Unavailable" : money(alert.currentPrice)}</strong><Icon name="chevron" size={18}/>
            </button>
            {open && <div className="alert-detail">
              <div className="alert-detail-stats">
                <span>Tracked at<strong>{alert.trackedPrice === null ? "Unavailable" : money(alert.trackedPrice)}</strong><small>{contextLabel(alert)}</small></span>
                <span>Target<strong>{alert.targetPrice === null ? "Not set" : money(alert.targetPrice)}</strong><small>{alert.targetPrice === null ? "Set a target to get a clear status" : distance === 0 ? "Target reached" : distance === null ? "Price unavailable" : `${money(distance)} away from target`}</small></span>
                <span>Last checked<strong>{refreshing.has(alert.id) ? "Checking now…" : timeLabel(alert.lastCheckedAt)}</strong><small>{stale ? "Last verified price may be stale" : alert.state === "ready" ? "Live eBay price" : "Last real price retained"}</small></span>
              </div>
              <p className="alert-source">{alert.currentRetailer ? `Live ${alert.currentRetailer} offer` : "Live eBay tracking"} · {timeLabel(alert.lastSuccessfulAt)}{alert.currentListingUrl ? " · Listing available" : ""}</p>
              {editing === alert.id && <form className="alert-target-form" onSubmit={(event) => saveTarget(event, alert)}><label>Target price ($)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={target} placeholder="No target" onChange={(event) => setTarget(event.target.value)}/></label><button type="submit">Save target</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></form>}
              <div className="alert-actions"><Link href={comparisonHref(alert)}>View comparison <Icon name="arrow" size={15}/></Link><button type="button" onClick={() => beginEdit(alert)}>Edit alert</button><button type="button" onClick={() => togglePause(alert)}>{alert.paused ? "Resume" : "Pause"}</button><button type="button" className="is-danger" onClick={() => removeAlert(alert)}>Remove</button></div>
            </div>}
          </article>;
        })}
      </div> : <div className="alerts-empty"><Icon name="bell" size={28}/><h2>No alerts yet</h2><p>Search for a product and track its live price to add it here.</p><Link className="button button-primary" href="/#product-search">+ Add Product <Icon name="arrow" size={17}/></Link></div>}
    </section>
    <p className="alerts-local-note"><Icon name="lock" size={16}/>Alerts and targets are stored locally in this browser. Active prices refresh when you open this page.</p>
  </main>;
}
