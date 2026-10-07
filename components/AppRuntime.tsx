"use client";

import { useEffect } from "react";
import { listenForInstall, runningAsApp } from "@/lib/install-app";

/**
 * Runs once on every page: registers the worker that makes Kelus open offline and instantly (production only, so
 * development never serves cached files), catches the browser's install offer before it is missed, and marks the
 * page when it is running as an installed app, so the layout can drop browser-only chrome.
 */
export function AppRuntime() {
  useEffect(() => {
    listenForInstall();
    if (runningAsApp()) document.documentElement.classList.add("is-installed-app");
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => { navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined); };
    // After the page has settled, so registering never competes with the first paint.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
