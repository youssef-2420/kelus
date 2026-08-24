"use client";

import { useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

type AlertStatus = "reached" | "dropped" | "paused" | "increased";
type Alert = {
  id: string;
  product: string;
  variant: string;
  price: number;
  trackedPrice: number;
  targetPrice: number;
  recentLow: number;
  typicalPrice: number;
  change?: number;
  status: AlertStatus;
  retailer: string;
  updated: string;
  comparisonHref?: string;
};

const storageKey = "kelus-demo-alert-records";
const referenceAlerts: Alert[] = [
  { id: "iphone-17-pro", product: "iPhone 17 Pro", variant: "256GB · New", price: 799, trackedPrice: 899, targetPrice: 799, recentLow: 799, typicalPrice: 879, change: -11.1, status: "reached", retailer: "eBay", updated: "12m ago", comparisonHref: "/results-v2?product=iphone-17-pro&variant=iphone-17-pro-256gb&condition=new&market=us" },
  { id: "macbook-air-m4", product: "MacBook Air M4", variant: "16GB · 512GB · New", price: 1149, trackedPrice: 1199, targetPrice: 1099, recentLow: 1099, typicalPrice: 1179, change: -4.2, status: "dropped", retailer: "Amazon", updated: "34m ago" },
  { id: "sony-wh-1000xm6", product: "Sony WH-1000XM6", variant: "Black · New", price: 349, trackedPrice: 349, targetPrice: 299, recentLow: 319, typicalPrice: 349, status: "paused", retailer: "Best Buy", updated: "3h ago" },
  { id: "ipad-pro-m4", product: "iPad Pro M4", variant: "11-inch · 256GB · Wi-Fi", price: 1024, trackedPrice: 999, targetPrice: 950, recentLow: 949, typicalPrice: 999, change: 2.5, status: "increased", retailer: "Apple", updated: "8m ago" },
];

const money = (value: number) => `$${value.toLocaleString("en-US")}`;

function loadAlerts() {
  if (typeof window === "undefined") return referenceAlerts;
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    return Array.isArray(stored) ? stored as Alert[] : referenceAlerts;
  } catch {
    return referenceAlerts;
  }
}

function statusLabel(alert: Alert) {
  if (alert.status === "reached") return "Target reached";
  if (alert.status === "dropped") return "Price dropped";
  if (alert.status === "paused") return "Paused";
  return "Price up";
}

function distanceLabel(alert: Alert) {
  if (alert.price <= alert.targetPrice) return "✓ reached";
  return `${money(alert.price - alert.targetPrice)} away`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(loadAlerts);
  const [expanded, setExpanded] = useState<string | null>(alerts[0]?.id ?? null);

  function persist(next: Alert[]) {
    setAlerts(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function togglePause(alert: Alert) {
    persist(alerts.map((item) => item.id === alert.id ? { ...item, status: item.status === "paused" ? "dropped" : "paused" } : item));
  }

  function removeAlert(alert: Alert) {
    const next = alerts.filter((item) => item.id !== alert.id);
    persist(next);
    if (expanded === alert.id) setExpanded(next[0]?.id ?? null);
  }

  function downloadAlert(alert: Alert) {
    const cells = ["Product", "Variant", "Current Price", "Tracked Price", "Target Price", "Status", "Retailer"];
    const values = [alert.product, alert.variant, alert.price, alert.trackedPrice, alert.targetPrice, statusLabel(alert), alert.retailer];
    const csv = `${cells.join(",")}\n${values.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")}\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${alert.id}-alert.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className="app-page alerts-page"><KelusHeader />
    <section className="alerts-main section">
      <div className="alerts-heading"><div><p className="eyebrow">Your price alerts</p><h1>My Alerts</h1><p>Track products you want and know when the price is worth buying.</p></div><Link href="/#product-search" className="alerts-add" aria-label="Add a new price alert">+</Link></div>
      {alerts.length ? <div className="alerts-list">
        {alerts.map((alert) => {
          const open = expanded === alert.id;
          const increased = (alert.change ?? 0) > 0;
          return <article className={`alert-row${alert.status === "paused" ? " is-paused" : ""}${open ? " is-open" : ""}`} key={alert.id}>
            <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : alert.id)}>
              <span className="alert-product"><b>{alert.product}</b><small>{alert.variant}</small></span>
              <span className={`alert-status is-${alert.status}`}>{statusLabel(alert)}</span>
              {alert.change !== undefined && <span className={`alert-change${increased ? " is-up" : ""}`}>{increased ? "↑" : "↓"} {Math.abs(alert.change)}%</span>}
              <strong>{money(alert.price)}</strong><Icon name="chevron" size={18}/>
            </button>
            {open && <div className="alert-detail">
              <div className="alert-detail-stats"><span>When tracked<strong>{money(alert.trackedPrice)}</strong></span><span>Target<strong>{money(alert.targetPrice)}</strong><small>{distanceLabel(alert)}</small></span><span>Context<strong>Low {money(alert.recentLow)} · Typical {money(alert.typicalPrice)}</strong></span></div>
              <p className="alert-source">{alert.retailer} · {alert.updated} · Demo reference</p>
              <div className="alert-actions">{alert.comparisonHref ? <Link href={alert.comparisonHref}>View comparison <Icon name="arrow" size={15}/></Link> : <Link href="/#product-search">Search this product <Icon name="arrow" size={15}/></Link>}<button type="button" onClick={() => downloadAlert(alert)}>Download</button><button type="button" onClick={() => togglePause(alert)}>{alert.status === "paused" ? "Resume" : "Pause"}</button><button type="button" className="is-danger" onClick={() => removeAlert(alert)}>Delete</button></div>
            </div>}
          </article>;
        })}
      </div> : <div className="alerts-empty"><Icon name="bell" size={28}/><h2>No alerts yet</h2><p>Search for a product and track its price to add it here.</p><Link className="button button-primary" href="/#product-search">Start a search <Icon name="arrow" size={17}/></Link></div>}
    </section>
    <p className="alerts-local-note"><Icon name="lock" size={16}/>Demo alert data is stored locally in this browser only.</p>
  </main>;
}
