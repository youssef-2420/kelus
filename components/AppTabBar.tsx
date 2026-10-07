"use client";

import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PackArt, type PackArtName } from "@/components/PackArt";
import styles from "./AppTabBar.module.css";

export type AppTab<Id extends string> = { id: Id; label: string; art: PackArtName };

const noop = () => () => {};

/**
 * On a phone, the sections sit in a bottom tab bar, where a thumb reaches them, as in a native app. It is attached
 * to the page body so no animated parent can pin it anywhere but the bottom of the screen; on wider screens it is
 * not shown and the side column's navigation is used instead.
 */
export function AppTabBar<Id extends string>({ tabs, active, onSelect }: { tabs: AppTab<Id>[]; active: Id; onSelect: (id: Id) => void }) {
  const reduce = useReducedMotion() === true;
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <nav className={styles.bar} aria-label="Sections">
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <motion.button
            key={tab.id}
            type="button"
            className={on ? `${styles.tab} ${styles.on}` : styles.tab}
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
          >
            {on && !reduce ? <motion.span layoutId="app-tab-pill" className={styles.pill} transition={{ type: "spring", bounce: 0, duration: 0.35 }} /> : on ? <span className={styles.pill} /> : null}
            <PackArt name={tab.art} className={styles.icon} />
            <span className={styles.label}>{tab.label}</span>
          </motion.button>
        );
      })}
    </nav>,
    document.body,
  );
}
