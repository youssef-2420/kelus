"use client";

import { useSyncExternalStore } from "react";
import { aiConfigured, forgetAiContent, getAiConsent, setAiConsent, subscribeAiConsent } from "@/lib/ai-client";
import { getLocalAiProgress, getLocalAiState, prepareLocalAi, subscribeLocalAi } from "@/lib/local-ai";
import styles from "./AiConsent.module.css";

/**
 * Off by default. Shown when a question-writing service is configured, or when this browser has its own
 * on-device model (recent Chrome). Says exactly what happens to your notes in each case.
 */
export function AiConsent() {
  const on = useSyncExternalStore(subscribeAiConsent, getAiConsent, () => false);
  const local = useSyncExternalStore(subscribeLocalAi, getLocalAiState, () => "unknown");
  const progress = useSyncExternalStore(subscribeLocalAi, getLocalAiProgress, () => 0);
  const remote = aiConfigured();
  const onDevice = !remote && local !== "unknown" && local !== "unavailable";
  if (!remote && !onDevice) return null;

  async function change(next: boolean) {
    if (!next) { setAiConsent(false); forgetAiContent(); return; }
    if (remote) { setAiConsent(true); return; }
    // The model download has to start from this click.
    const ready = await prepareLocalAi();
    setAiConsent(ready);
  }

  const downloading = local === "downloading";
  return (
    <section className={styles.card} aria-labelledby="ai-consent-title">
      <div>
        <h3 id="ai-consent-title">Smarter questions</h3>
        <p>
          Let an AI model read the text of each topic you confirm, and write questions and explanations from it. Every question
          quotes your page, and anything it can’t quote is thrown away.
        </p>
        {remote ? (
          <p className={styles.fine}>
            Only that page text is sent. Your files, name and answers stay on this device, and the service doesn’t store what it receives.
            Off by default; turn it off any time and what it wrote is removed from this device.
          </p>
        ) : (
          <p className={styles.fine}>
            The model runs inside your browser, so your notes never leave this device. The first time, Chrome downloads it (about 2 GB, once).
            Questions are written in the background for your next topics. Turn it off any time and what it wrote is removed.
          </p>
        )}
        {downloading ? <p className={styles.fine} role="status">Downloading the on-device model… {Math.round(progress * 100)}%</p> : null}
      </div>
      <label className={styles.switch}>
        <input type="checkbox" checked={on} disabled={downloading} onChange={(event) => void change(event.target.checked)} />
        <span>{downloading ? "Preparing" : on ? "On" : "Off"}</span>
      </label>
    </section>
  );
}
