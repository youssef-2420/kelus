/**
 * Nudges: one notification a day, at a time you choose, when lines you missed are ready for a warm-up.
 *
 * A website cannot wake itself up, so this works while Kelus is open in a tab, and in the background only when
 * Kelus is installed as an app in a browser that allows periodic background sync (Chrome). The calendar
 * reminder is the one that always arrives. Everything stays on this device.
 */

import { SPACING_MS } from "@/domain/return-visit";
import { dayKey } from "@/domain/habit";

export type NudgeSettings = { on: boolean; time: string };
export type NudgeSummary = NudgeSettings & { lines: number[]; lastAnswerAt: string | null };

const KEY = "kelus-nudge-v1";
const EVENT = "kelus-nudge";
const DB = "kelus-nudge";
const STORE = "kv";
const DEFAULT: NudgeSettings = { on: false, time: "18:00" };
let cache: { raw: string | null; value: NudgeSettings } = { raw: null, value: DEFAULT };

export function nudgesSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function getNudgeSettings(): NudgeSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.value;
    const parsed = raw ? JSON.parse(raw) : null;
    cache = { raw, value: parsed && typeof parsed.on === "boolean" && /^\d\d:\d\d$/.test(parsed.time) ? parsed : DEFAULT };
    return cache.value;
  } catch {
    return DEFAULT;
  }
}

export const getServerNudgeSettings = () => DEFAULT;

export function subscribeNudgeSettings(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", onChange); };
}

function saveSettings(settings: NudgeSettings) {
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Without storage nudges stay off. */ }
  window.dispatchEvent(new Event(EVENT));
}

/** The Permissions API is the more reliable reading where both exist; Notification.permission is the fallback. */
export async function permission(): Promise<NotificationPermission | "unsupported"> {
  if (!nudgesSupported()) return "unsupported";
  try {
    const state = (await navigator.permissions.query({ name: "notifications" })).state;
    return state === "prompt" ? "default" : state;
  } catch {
    return Notification.permission;
  }
}

async function registration() {
  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  } catch {
    return null;
  }
}

/** Background checks, where the browser offers them (an installed app in Chrome). Silent no-op elsewhere. */
async function registerBackgroundCheck() {
  const reg = await registration();
  const periodic = (reg as (ServiceWorkerRegistration & { periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }) | null)?.periodicSync;
  if (!periodic) return false;
  try {
    const state = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    if (state.state !== "granted") return false;
    await periodic.register("kelus-nudge", { minInterval: 6 * 60 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

/** Must run from a click: browsers only show the permission prompt for a gesture. */
export async function turnOnNudges(time: string) {
  if (!nudgesSupported()) return "unsupported" as const;
  const answer = (await permission()) === "granted" ? "granted" : await Notification.requestPermission();
  if (answer !== "granted") { saveSettings({ on: false, time }); return answer; }
  saveSettings({ on: true, time });
  await registration();
  await registerBackgroundCheck();
  return "granted" as const;
}

export function turnOffNudges() {
  saveSettings({ ...getNudgeSettings(), on: false });
}

export function setNudgeTime(time: string) {
  saveSettings({ ...getNudgeSettings(), time });
}

export async function sendTestNudge() {
  const reg = await registration();
  const options = { body: "This is what a nudge looks like. Lines you missed come back here, once a day.", tag: "kelus-test", icon: "/apple-icon.png" };
  try {
    if (reg) await reg.showNotification("Kelus nudges are on", options);
    else new Notification("Kelus nudges are on", options);
    return true;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

/** What the background worker needs to decide, kept beside it on this device. */
export function writeNudgeSummary(summary: NudgeSummary) {
  if (typeof indexedDB === "undefined") return;
  void idb("readwrite", (store) => { store.put(summary, "summary"); });
}

export function readyCount(lines: number[], nowMs: number) {
  return lines.filter((at) => nowMs - at >= SPACING_MS).length;
}

/**
 * The once-a-day rule, shared by the open tab and the worker: after your time, only if lines are ready, only if
 * you have not studied today, and never twice on the same day.
 */
export function nudgeDue(summary: NudgeSummary, now: Date, shownDay: string | null | undefined) {
  const today = dayKey(now);
  const [hours, minutes] = summary.time.split(":").map(Number);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).getTime();
  const ready = readyCount(summary.lines, now.getTime());
  const studiedToday = summary.lastAnswerAt ? dayKey(new Date(summary.lastAnswerAt)) === today : false;
  return { due: summary.on && now.getTime() >= at && ready > 0 && !studiedToday && shownDay !== today, ready, today };
}

export async function maybeNudgeNow(summary: NudgeSummary, now = new Date()) {
  if (!summary.on || (await permission()) !== "granted") return false;
  const shown = await idb<string>("readonly", (store) => store.get("lastShownDay"));
  const { due, ready, today } = nudgeDue(summary, now, shown);
  if (!due) return false;
  const reg = await registration();
  const title = "Your 1-minute warm-up is ready";
  const options = { body: ready === 1 ? "One line you missed is ready to try again." : `${ready} lines you missed are ready to try again.`, tag: "kelus-warmup", icon: "/apple-icon.png", data: { url: "/today" } };
  try {
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // The browser refused (permission withdrawn, or no notification support): try again next check, not tomorrow.
    return false;
  }
  // Only a nudge that was really shown counts for today.
  await idb("readwrite", (store) => { store.put(today, "lastShownDay"); });
  return true;
}
