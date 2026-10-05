"use client";

import { useSyncExternalStore } from "react";
import { aiConfigured, forgetAiContent, getAiConsent, setAiConsent, subscribeAiConsent } from "@/lib/ai-client";
import styles from "./AiConsent.module.css";

/**
 * Off by default. Hidden entirely until the site is built with an AI endpoint.
 * Says exactly what leaves the device, and that nothing is stored on the server.
 */
export function AiConsent() {
  const on = useSyncExternalStore(subscribeAiConsent, getAiConsent, () => false);
  if (!aiConfigured()) return null;

  function change(next: boolean) {
    setAiConsent(next);
    if (!next) forgetAiContent();
  }

  return (
    <section className={styles.card} aria-labelledby="ai-consent-title">
      <div>
        <h3 id="ai-consent-title">Smarter questions</h3>
        <p>
          Let an AI model read the text of each topic you confirm, and write questions and explanations from it. Every question
          quotes your page, and anything it can’t quote is thrown away.
        </p>
        <p className={styles.fine}>
          Only that page text is sent. Your files, name and answers stay on this device, and the service doesn’t store what it receives.
          Off by default; turn it off any time and what it wrote is removed from this device.
        </p>
      </div>
      <label className={styles.switch}>
        <input type="checkbox" checked={on} onChange={(event) => change(event.target.checked)} />
        <span>{on ? "On" : "Off"}</span>
      </label>
    </section>
  );
}
