/*
 * Kelus nudges. This worker does one thing: tell you when lines you missed are ready for a warm-up.
 * It has no fetch handler, so it never caches or intercepts pages. Everything it reads was written by the page
 * into IndexedDB on this device; nothing is sent anywhere.
 */

const DB = "kelus-nudge";
const STORE = "kv";
const SPACING_MS = 4 * 60 * 60 * 1000;

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function get(key) {
  const db = await open();
  return new Promise((resolve) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
}

async function put(key, value) {
  const db = await open();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Same rule as the page: once a day, after your chosen time, only if lines are ready and you have not studied today. */
async function maybeNudge() {
  const summary = await get("summary");
  if (!summary || !summary.on) return;
  const now = new Date();
  const today = dayKey(now);
  const [hours, minutes] = String(summary.time || "18:00").split(":").map(Number);
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).getTime();
  const ready = (summary.lines || []).filter((at) => now.getTime() - at >= SPACING_MS).length;
  const shown = await get("lastShownDay");
  const studiedToday = summary.lastAnswerAt && dayKey(new Date(summary.lastAnswerAt)) === today;
  if (now.getTime() < due || ready === 0 || shown === today || studiedToday) return;
  await put("lastShownDay", today);
  await self.registration.showNotification("Your 1-minute warm-up is ready", {
    body: ready === 1 ? "One line you missed is ready to try again." : `${ready} lines you missed are ready to try again.`,
    tag: "kelus-warmup",
    icon: "/apple-icon.png",
    badge: "/apple-icon.png",
    data: { url: "/today" },
  });
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "kelus-nudge") event.waitUntil(maybeNudge());
});

self.addEventListener("message", (event) => {
  if (event.data === "kelus-nudge-check") event.waitUntil(maybeNudge());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/today";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (open) { await open.focus(); open.navigate(url); return; }
    await self.clients.openWindow(url);
  })());
});
