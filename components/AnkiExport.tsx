"use client";

import { useState } from "react";
import { ankiCards, ankiFile } from "@/domain/anki-export";
import type { Concept, LearningActivity } from "@/domain/types";
import { trackEvent } from "@/lib/analytics";
import { BrandIcon } from "@/components/BrandIcon";
import styles from "./AnkiExport.module.css";

/** Takes the course's questions to Anki: one file, imported with File → Import. Built on this device; nothing is sent. */
export function AnkiExport({ course, concepts, activities }: { course: string; concepts: Concept[]; activities: LearningActivity[] }) {
  const [done, setDone] = useState<number | null>(null);
  if (!concepts.length) return null;

  function download() {
    const cards = ankiCards(concepts, activities);
    const blob = new Blob([ankiFile(course, cards)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${course.replace(/[\\/:*?"<>|]+/g, " ").trim() || "Kelus"} – Anki.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(cards.length);
    trackEvent({ name: "anki_exported", card_count: cards.length });
  }

  return (
    <section className={styles.card} aria-labelledby="anki-title">
      <span className={styles.logo}><BrandIcon brand="anki" size={40} tile /></span>
      <div>
        <h2 id="anki-title">Take your cards to Anki</h2>
        <p>Every question for these {concepts.length} topics, with the answer and the line from your notes on the back.</p>
      </div>
      <button type="button" className="k-btn k-btn--paper k-btn--small" onClick={download}>Export for Anki</button>
      {done !== null ? (
        <p className={styles.done} role="status">
          {done} cards saved. In Anki: <b>File → Import</b>, choose the file, then <b>Import</b>. They land in the deck <b>Kelus::{course}</b>.
        </p>
      ) : null}
    </section>
  );
}
