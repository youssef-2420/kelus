"use client";

import { useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

type Alert = { product: string; variant: string; price: number; change?: number; status: "active" | "paused" };

const referenceAlerts: Alert[] = [
  { product: "iPhone 17 Pro", variant: "256GB · New", price: 799, change: -11.1, status: "active" },
  { product: "MacBook Air M4", variant: "16GB · 512GB · New", price: 1149, change: -4.2, status: "active" },
  { product: "Sony WH-1000XM6", variant: "Black · New", price: 349, status: "paused" },
  { product: "iPad Pro M4", variant: "11-inch · 256GB · Wi-Fi", price: 1024, change: 2.5, status: "active" },
];

export default function AlertsPage() {
  const [expanded, setExpanded] = useState<string | null>(referenceAlerts[0].product);
  return <main className="app-page alerts-page"><KelusHeader />
    <section className="alerts-main section">
      <div className="alerts-heading"><div><p className="eyebrow">Your price alerts</p><h1>My Alerts</h1><p>Track products you want and know when the price is worth buying.</p></div><Link href="/" className="alerts-add" aria-label="Add a new price alert">+</Link></div>
      <div className="alerts-list">
        {referenceAlerts.map((alert) => {
          const open = expanded === alert.product;
          const increased = (alert.change ?? 0) > 0;
          return <article className={`alert-row${alert.status === "paused" ? " is-paused" : ""}${open ? " is-open" : ""}`} key={alert.product}>
            <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : alert.product)}>
              <span className="alert-product"><b>{alert.product}</b><small>{alert.variant}</small></span>
              {alert.change !== undefined && <span className={`alert-change${increased ? " is-up" : ""}`}>{increased ? "↑" : "↓"} {Math.abs(alert.change)}%</span>}
              <strong>${alert.price.toLocaleString("en-US")}</strong><Icon name="chevron" size={18}/>
            </button>
            {open && <div className="alert-detail"><p>{increased ? "The latest tracked price has increased." : "The latest tracked price has moved down."} Open the live comparison before deciding.</p><Link href="/results-v2?product=iphone-17&amp;variant=iphone-17-256&amp;condition=any&amp;market=us">View comparison <Icon name="arrow" size={15}/></Link></div>}
          </article>;
        })}
      </div>
    </section>
    <p className="alerts-local-note"><Icon name="lock" size={16}/>Alerts are stored locally in this browser only.</p>
  </main>;
}
