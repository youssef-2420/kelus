"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { GuestSyncBanner } from "@/components/GuestSyncBanner";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import { SafeLink as Link } from "@/components/SafeLink";
import { comparisonHref, getAlertStatus, getDistanceFromTarget, getPriceChange, isAlertStale, type PriceAlertRecord, readPriceAlerts, updateAlertFromError, updateAlertFromResult, writePriceAlerts } from "@/services/price-alerts";
import { retrySearch } from "@/services/search-session";
import { deleteUserAlert, migrateLocalAlerts, readUserAlerts, refreshUserAlerts, upsertUserAlerts } from "@/services/user-alerts";

const money = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;

function timeLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not checked yet";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "Updated now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  if (minutes < 1_440) return `Updated ${Math.floor(minutes / 60)}h ago`;
  return `Updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value))}`;
}

function checkTimeLabel(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
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

function checkLabel(alert: PriceAlertRecord, refreshing: boolean, stale: boolean) {
  if (refreshing) return "Checking now…";
  if (alert.paused) return `Checks paused · ${checkTimeLabel(alert.lastCheckedAt)}`;
  if (alert.state === "error") return `Check failed · ${checkTimeLabel(alert.lastCheckedAt)}`;
  if (alert.state === "unavailable") return `Checked ${checkTimeLabel(alert.lastCheckedAt)} · No validated offer`;
  if (stale) return `Last checked ${checkTimeLabel(alert.lastCheckedAt)} · Saved price may be stale`;
  return `Checked ${checkTimeLabel(alert.lastCheckedAt)} · Price verified`;
}

function targetProgress(alert: PriceAlertRecord) {
  if (alert.trackedPrice === null || alert.currentPrice === null || alert.targetPrice === null || alert.trackedPrice <= alert.targetPrice) return null;
  return Math.max(0, Math.min(100, Math.round(((alert.trackedPrice - alert.currentPrice) / (alert.trackedPrice - alert.targetPrice)) * 100)));
}

function AlertImage({ alert }: { alert: PriceAlertRecord }) {
  const [failed, setFailed] = useState(false);
  return <span className="alert-image">{alert.imageUrl?.startsWith("https://") && !failed ? <img src={alert.imageUrl} alt="" onError={() => setFailed(true)}/> : <ProductMark label={alert.imageLabel} small/>}</span>;
}

function AlertsLoadingSkeleton() {
  return <div className="alerts-list alerts-list--loading" aria-busy="true" aria-live="polite">
    {[0, 1, 2].map((index) => <div className="alert-skeleton-row" key={index}><i/><div><b/><span/></div><strong/><em/><span aria-hidden="true"/></div>)}
    <p className="alerts-loading-status" role="status">Loading your price alerts…</p>
  </div>;
}

export default function AlertsPage() {
  const { loading: authLoading, user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlertRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [syncError, setSyncError] = useState("");
  const toggleRefs = useRef(new Map<string, HTMLButtonElement>());
  const detailRefs = useRef(new Map<string, HTMLDivElement>());

  async function fetchGuestAlertUpdates(stored: PriceAlertRecord[]) {
    return Promise.all(stored.map(async (alert) => {
      if (alert.paused) return alert;
      try { return updateAlertFromResult(alert, await retrySearch(alert.criteria)); }
      catch (error) { return updateAlertFromError(alert, error instanceof Error ? error.message : "The latest price check failed."); }
    }));
  }

  async function refreshGuestAlerts(stored: PriceAlertRecord[]) {
    setRefreshing(new Set(stored.filter((alert) => !alert.paused).map((alert) => alert.id)));
    const updated = await fetchGuestAlertUpdates(stored);
    setAlerts(updated);
    setRefreshing(new Set());
    writePriceAlerts(updated);
    return updated;
  }

  async function checkGuestPrices() {
    if (!alerts.length || refreshingAll) return;
    setSyncError("");
    setRefreshingAll(true);
    try { await refreshGuestAlerts(alerts); }
    catch { setSyncError("Prices could not be checked right now. Please try again."); }
    finally { setRefreshingAll(false); }
  }

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setSyncError(""); setInitialLoading(true); } });
    async function loadAndRefresh() {
      let stored: PriceAlertRecord[];
      try {
        if (user) { await migrateLocalAlerts(user); stored = await readUserAlerts(user.id); }
        else stored = readPriceAlerts();
      } catch {
        if (!cancelled) { setSyncError("We couldn’t sync your alerts. Your local alerts were kept safely."); setInitialLoading(false); }
        return;
      }
      if (cancelled) return;
      setAlerts(stored); setExpanded(null);
      setRefreshing(new Set(stored.filter((alert) => !alert.paused).map((alert) => alert.id)));
      let updated: PriceAlertRecord[];
      if (user) {
        try { await refreshUserAlerts(user.id); updated = await readUserAlerts(user.id); }
        catch { updated = stored; if (!cancelled) setSyncError("Your saved alerts are safe, but prices could not be checked right now."); }
      } else {
        updated = await refreshGuestAlerts(stored);
      }
      if (cancelled) return;
      if (user) {
        setAlerts(updated);
        setRefreshing(new Set());
      }
      setInitialLoading(false);
    }
    void loadAndRefresh();
    return () => { cancelled = true; };
  }, [authLoading, user]);

  function persist(next: PriceAlertRecord[]) {
    setAlerts(next); setSyncError("");
    if (user) upsertUserAlerts(user.id, next).catch(() => setSyncError("This change could not be synced. Please try again."));
    else writePriceAlerts(next);
  }
  function togglePause(alert: PriceAlertRecord) { persist(alerts.map((item) => item.id === alert.id ? { ...item, paused: !item.paused } : item)); }
  function removeAlert(alert: PriceAlertRecord) {
    const wasExpanded = expanded === alert.id;
    const next = alerts.filter((item) => item.id !== alert.id); setAlerts(next);
    if (user) deleteUserAlert(user.id, alert.id).catch(() => { setAlerts(alerts); setSyncError("The alert could not be removed. Please try again."); });
    else writePriceAlerts(next);
    if (wasExpanded) {
      setExpanded(next[0]?.id ?? null);
      queueMicrotask(() => next[0] && toggleRefs.current.get(next[0].id)?.focus());
    }
  }
  function beginEdit(alert: PriceAlertRecord) { setEditing(alert.id); setTarget(alert.targetPrice?.toString() ?? ""); }
  function saveTarget(event: FormEvent, alert: PriceAlertRecord) {
    event.preventDefault();
    const parsed = target.trim() ? Number(target) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
    persist(alerts.map((item) => item.id === alert.id ? { ...item, targetPrice: parsed === null ? null : Math.round(parsed * 100) / 100 } : item));
    setEditing(null);
  }

  function toggleExpanded(alertId: string, open: boolean) {
    if (open) {
      setExpanded(alertId);
      queueMicrotask(() => {
        const detail = detailRefs.current.get(alertId);
        const focusable = detail?.querySelector<HTMLElement>('button, a[href], input:not([disabled])');
        focusable?.focus();
      });
      return;
    }
    const toggle = toggleRefs.current.get(alertId);
    setExpanded(null);
    queueMicrotask(() => toggle?.focus());
  }

  const reachedCount = alerts.filter((alert) => getAlertStatus(alert) === "target_reached").length;
  const droppedCount = alerts.filter((alert) => getAlertStatus(alert) === "price_dropped").length;
  const activeCount = alerts.filter((alert) => !alert.paused).length;

  return <main className="app-page alerts-page"><KelusHeader />
    <section className="alerts-main section">
      <GuestSyncBanner />
      <div className="alerts-heading"><div><p className="eyebrow">Your price alerts</p><h1>Know when it’s worth buying.</h1><p>Kelus watches the exact configuration—not just the product name.</p></div><div className="alerts-heading-actions">{!user && alerts.length > 0 && <button type="button" className="alerts-refresh-button" onClick={() => { void checkGuestPrices(); }} disabled={refreshingAll || initialLoading} aria-busy={refreshingAll}><Icon name="search" size={16}/>{refreshingAll ? "Checking prices…" : "Check prices"}</button>}<Link href="/search" className="alerts-add-button"><Icon name="plus" size={17}/> Add product</Link></div></div>
      {syncError && <p className="alerts-sync-error" role="alert">{syncError}</p>}
      {authLoading || initialLoading ? <AlertsLoadingSkeleton/> : alerts.length > 0 && <div className="alerts-overview" aria-label="Price alert summary"><span><b>{activeCount}</b> actively watched</span><span><b>{droppedCount}</b> price dropped</span><span><b>{reachedCount}</b> target reached</span></div>}
      {!authLoading && !initialLoading && (alerts.length ? <div className="alerts-list">
        {alerts.map((alert) => {
          const open = expanded === alert.id;
          const status = getAlertStatus(alert);
          const change = getPriceChange(alert);
          const distance = getDistanceFromTarget(alert);
          const stale = isAlertStale(alert);
          const progress = targetProgress(alert);
          return <article className={`alert-row${alert.paused ? " is-paused" : ""}${open ? " is-open" : ""}`} key={alert.id}>
            <button ref={(node) => { if (node) toggleRefs.current.set(alert.id, node); else toggleRefs.current.delete(alert.id); }} type="button" aria-expanded={open} aria-controls={`alert-detail-${alert.id}`} aria-label={`${alert.productName}, ${alert.configuration}. ${open ? "Collapse" : "Expand"} alert details`} onClick={() => toggleExpanded(alert.id, !open)}>
              <span className="alert-product"><AlertImage alert={alert}/><span><b>{alert.productName}</b><small>{alert.configuration}</small></span></span>
              <span className={`alert-status is-${status}`}>{statusLabel(alert)}</span>
              <span className="alert-price"><small>Current best</small><strong>{alert.currentPrice === null ? "Unavailable" : money(alert.currentPrice)}</strong>{change && change.amount !== 0 ? <em className={`alert-change${change.amount > 0 ? " is-up" : ""}`}>{change.amount > 0 ? "↑" : "↓"} {money(Math.abs(change.amount))} ({Math.abs(change.percent)}%)</em> : <em className="alert-change is-neutral">No verified change</em>}</span><Icon name="chevron" size={18}/>
            </button>
            <div className="alert-glance"><span className={`alert-check is-${alert.state}`}><i aria-hidden="true"/>{checkLabel(alert, refreshing.has(alert.id), stale)}</span><span className="alert-target-glance">Target <b>{alert.targetPrice === null ? "Not set" : money(alert.targetPrice)}</b>{distance !== null && distance > 0 ? ` · ${money(distance)} away` : distance === 0 ? " · Reached" : ""}</span><Link href={comparisonHref(alert)}>View comparison <Icon name="arrow" size={14}/></Link></div>
            {open && <div className="alert-detail" id={`alert-detail-${alert.id}`} ref={(node) => { if (node) detailRefs.current.set(alert.id, node); else detailRefs.current.delete(alert.id); }}>
              <div className="alert-detail-stats">
                <span>Tracked at<strong>{alert.trackedPrice === null ? "Unavailable" : money(alert.trackedPrice)}</strong><small>{contextLabel(alert)}</small></span>
                <span>Target<strong>{alert.targetPrice === null ? "Not set" : money(alert.targetPrice)}</strong><small>{alert.targetPrice === null ? "Set a target to get a clear status" : distance === 0 ? "Target reached" : distance === null ? "Price unavailable" : `${money(distance)} away from target`}</small>{progress !== null && <progress value={progress} max="100" aria-label={`${progress}% of the way to the target price`}/>}</span>
                <span>Last checked<strong>{refreshing.has(alert.id) ? "Checking now…" : timeLabel(alert.lastCheckedAt)}</strong><small>{stale ? "Last verified price may be stale" : alert.state === "ready" ? "Live eBay price" : "Last real price retained"}</small></span>
              </div>
              <p className="alert-source">{alert.currentRetailer ? `Live ${alert.currentRetailer} offer` : "Live eBay tracking"} · {timeLabel(alert.lastSuccessfulAt)}{alert.currentListingUrl ? " · Listing available" : ""}</p>
              {editing === alert.id && <form className="alert-target-form" onSubmit={(event) => saveTarget(event, alert)}><label>Target price ($)<input type="number" min="0.01" step="0.01" inputMode="decimal" value={target} placeholder="No target" onChange={(event) => setTarget(event.target.value)}/></label><button type="submit">Save target</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></form>}
              <div className="alert-actions"><button type="button" onClick={() => beginEdit(alert)}>Edit target</button><button type="button" onClick={() => togglePause(alert)}>{alert.paused ? "Resume tracking" : "Pause tracking"}</button><button type="button" className="is-danger" onClick={() => removeAlert(alert)}>Remove alert</button></div>
            </div>}
          </article>;
        })}
      </div> : <div className="alerts-empty" aria-live="polite"><span className="alerts-empty-icon"><Icon name="bell" size={25}/></span><p className="eyebrow">Nothing to watch yet</p><h2>Let Kelus watch the price.</h2><p>Choose an exact product, configuration, and condition. Kelus will keep the real first price as your baseline—never an estimate.</p><Link className="button button-primary" href="/search">Add your first product <Icon name="arrow" size={17}/></Link></div>)}
    </section>
    <p className="alerts-local-note"><Icon name="lock" size={16}/>{user ? "Your alerts are protected by your Kelus account, persist across devices, and are checked automatically. Kelus emails you when a saved target price is reached." : "Alerts are stored locally until you sign in. Sign in to get emailed when your target price is reached, and use Check prices to refresh active alerts without reloading."}</p>
  </main>;
}
