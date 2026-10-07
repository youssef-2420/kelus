"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PackArt } from "@/components/PackArt";
import { REMINDER_TIMES } from "@/lib/study-reminder";
import { trackEvent } from "@/lib/analytics";
import { getNudgeSettings, getServerNudgeSettings, nudgesSupported, permission, sendTestNudge, setNudgeTime, subscribeNudgeSettings, turnOffNudges, turnOnNudges } from "@/lib/nudge";
import styles from "./NudgeCard.module.css";

function label(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Asks once, from a click, whether Kelus may send one notification a day when your warm-up is ready.
 * Says honestly where it can arrive: in an open tab always, while closed only as an installed app.
 */
export function NudgeCard() {
  const reduce = useReducedMotion() === true;
  const settings = useSyncExternalStore(subscribeNudgeSettings, getNudgeSettings, getServerNudgeSettings);
  // Browser capabilities are only known after hydration; the card stays out of the server render.
  const [env, setEnv] = useState<{ supported: boolean; installed: boolean; allowed: NotificationPermission | "unsupported" } | null>(null);
  const [time, setTime] = useState(settings.time);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void permission().then((allowed) => { if (active) setEnv({ supported: nudgesSupported(), installed: window.matchMedia("(display-mode: standalone)").matches, allowed }); });
    return () => { active = false; };
  }, [settings.on]);

  if (!env?.supported) return null;
  const on = settings.on && env.allowed === "granted";
  const where = env.installed ? "It arrives even when Kelus is closed." : "It arrives while Kelus is open in a tab. Install Kelus as an app (your browser’s menu, then Install) and it arrives when it’s closed too.";

  async function enable() {
    setBusy(true);
    const result = await turnOnNudges(time);
    setBusy(false);
    const allowed = await permission();
    setEnv((current) => (current ? { ...current, allowed } : current));
    if (result === "granted") { setNote(null); trackEvent({ name: "nudges_enabled" }); }
    else if (result === "denied") setNote("Notifications are blocked for Kelus. You can allow them in your browser’s site settings.");
    else setNote("No notifications for now. You can turn them on any time.");
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {on ? (
        <motion.section key="on" className={`${styles.card} ${styles.compact}`} aria-label="Nudges" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.status}>
            <strong>Nudges on</strong> · at {label(settings.time)}, when lines you missed are ready.
            <span className={styles.where}>{where}</span>
          </p>
          <div className={styles.inline}>
            <label className="sr-only" htmlFor="nudge-time-on">Nudge time</label>
            <select id="nudge-time-on" value={settings.time} onChange={(event) => setNudgeTime(event.target.value)}>
              {REMINDER_TIMES.map((option) => <option key={option} value={option}>{label(option)}</option>)}
            </select>
            <button type="button" className={styles.link} onClick={() => void sendTestNudge()}>Send a test</button>
            <button type="button" className={styles.link} onClick={turnOffNudges}>Turn off</button>
          </div>
        </motion.section>
      ) : (
        <motion.section key="off" className={styles.card} aria-labelledby="nudge-title" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
          <PackArt name="on-the-laptop" className={styles.art} size={132} />
          <div className={styles.text}>
            <h2 id="nudge-title">A nudge when your warm-up is ready</h2>
            <p>One notification a day, only when lines you missed are ready to try again, and never after you’ve already studied that day.</p>
          </div>
          <div className={styles.controls}>
            <label>
              <span>Nudge me at</span>
              <select value={time} onChange={(event) => setTime(event.target.value)}>
                {REMINDER_TIMES.map((option) => <option key={option} value={option}>{label(option)}</option>)}
              </select>
            </label>
            <button type="button" className={`k-btn k-btn--marigold k-btn--small ${styles.primary}`} onClick={() => void enable()} disabled={busy || env.allowed === "denied"}>
              {busy ? "Asking your browser…" : "Turn on nudges"}
            </button>
          </div>
          {env.allowed === "denied" && !note ? <p className={styles.note}>Notifications are blocked for Kelus. You can allow them in your browser’s site settings.</p> : null}
          {note ? <p className={styles.note} role="status">{note}</p> : null}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
