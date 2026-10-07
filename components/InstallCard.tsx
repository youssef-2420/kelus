"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { installState, promptInstall, serverInstallState, subscribeInstall } from "@/lib/install-app";
import { trackEvent } from "@/lib/analytics";
import styles from "./InstallCard.module.css";

const DISMISS_KEY = "kelus-install-dismissed-v1";

function dismissedBefore() {
  try { return window.localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}

/** A small app icon, drawn like the one that will sit on the home screen. */
function AppIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#1f6b45" />
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10">
        <path d="M29 20v60" />
        <path d="M74 22C66 37 56 46 43 51c14 5 25 15 33 28" />
      </g>
    </svg>
  );
}

/** Safari's Share symbol, so the instruction points at what is really on screen. */
function ShareGlyph() {
  return (
    <svg className={styles.glyph} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11H5v10h14V11h-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Kelus on the home screen opens full screen, starts on Today, works offline and can nudge you even when closed.
 * Chrome and Edge get one Install button; iPhone gets the two taps Safari needs. Gone once installed or dismissed.
 */
export function InstallCard() {
  const reduce = useReducedMotion() === true;
  const state = useSyncExternalStore(subscribeInstall, installState, serverInstallState);
  const [dismissed, setDismissed] = useState(() => (typeof window === "undefined" ? true : dismissedBefore()));
  const [showSteps, setShowSteps] = useState(false);

  const visible = !dismissed && (state === "prompt" || state === "ios");

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* Shown again next time; harmless. */ }
    setDismissed(true);
  }

  async function install() {
    if (state === "ios") { setShowSteps(true); return; }
    const accepted = await promptInstall();
    if (accepted) trackEvent({ name: "app_installed" });
  }

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.section
          key="install"
          className={styles.card}
          aria-labelledby="install-title"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, transition: { duration: 0.15 } }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <AppIcon />
          <div className={styles.text}>
            <h2 id="install-title">Put Kelus on your home screen</h2>
            <p>It opens straight to today’s topic, full screen, even offline, and can nudge you when your warm-up is ready.</p>
          </div>
          {showSteps ? (
            <ol className={styles.steps} aria-label="Add to Home Screen in Safari">
              <li><span className={styles.num}>1</span> Tap <ShareGlyph /> <b>Share</b> in Safari’s toolbar</li>
              <li><span className={styles.num}>2</span> Choose <b>Add to Home Screen</b>, then <b>Add</b></li>
            </ol>
          ) : null}
          <div className={styles.actions}>
            {!showSteps ? (
              <motion.button type="button" className={`k-btn k-btn--small ${styles.primary}`} onClick={() => void install()} whileTap={reduce ? undefined : { scale: 0.97 }}>
                {state === "ios" ? "Show me how" : "Install Kelus"}
              </motion.button>
            ) : null}
            <button type="button" className={styles.later} onClick={dismiss}>{showSteps ? "Done" : "Not now"}</button>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
