"use client";

import { FormEvent, useState } from "react";
import { SafeLink as Link } from "@/components/SafeLink";

type Report = {
  generatedAt: string; periodDays: number;
  funnel: Record<string, number | null>;
  topProducts: Array<{ label: string; count: number }>;
  unsupportedSearches: Array<{ label: string; count: number }>;
  providerOutcomes: Array<{ label: string; count: number }>;
};

const labels: Record<string, string> = { landings: "Landings", searches: "Searches", productsResolved: "Products resolved", productViews: "Product views", recommendations: "Our Pick views", retailerClicks: "Retailer clicks", alertsCreated: "Alerts created", retailerClickRate: "Click-through rate", alertConversionRate: "Alert conversion" };

export default function DiagnosticsPage() {
  const [key, setKey] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/internal/diagnostics", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
      const body = await response.json() as Report & { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "Diagnostics could not be loaded.");
      setReport(body);
    } catch (reason) { setReport(null); setError(reason instanceof Error ? reason.message : "Diagnostics could not be loaded."); }
    finally { setLoading(false); }
  }
  return <main className="diagnostics-page"><header><Link className="wordmark" href="/">kelus</Link><span>Internal diagnostics</span></header><section>
    {!report ? <form className="diagnostics-access" onSubmit={submit}><p className="eyebrow">Restricted operations view</p><h1>Kelus funnel health</h1><p>Enter the existing monitoring key. It is sent only in the request header and is not saved by this page.</p><label>Operations key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="off" required/></label>{error && <p role="alert" className="auth-message is-error">{error}</p>}<button className="button button-primary" disabled={loading}>{loading ? "Loading…" : "Open diagnostics"}</button></form> : <><div className="diagnostics-heading"><div><p className="eyebrow">Last {report.periodDays} days</p><h1>Kelus funnel health</h1></div><button className="text-link" onClick={() => { setReport(null); setKey(""); }}>Lock view</button></div><div className="diagnostics-metrics">{Object.entries(report.funnel).map(([name, value]) => <article key={name}><span>{labels[name] ?? name}</span><strong>{value === null ? "—" : name.endsWith("Rate") ? `${value}%` : value}</strong></article>)}</div><div className="diagnostics-columns"><DiagnosticList title="Most resolved products" rows={report.topProducts}/><DiagnosticList title="Unsupported searches" rows={report.unsupportedSearches}/><DiagnosticList title="Provider outcomes" rows={report.providerOutcomes}/></div><p className="diagnostics-updated">Generated {new Date(report.generatedAt).toLocaleString()}</p></>}
  </section></main>;
}

function DiagnosticList({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  return <article className="diagnostics-list"><h2>{title}</h2>{rows.length ? <ol>{rows.map((row) => <li key={row.label}><span>{row.label}</span><strong>{row.count}</strong></li>)}</ol> : <p>No data recorded yet.</p>}</article>;
}
