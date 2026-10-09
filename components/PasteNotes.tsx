"use client";

import { BrandIcon } from "@/components/BrandIcon";
import { useState } from "react";
import { MAX_NOTES_BYTES, pastedTitle, structurePastedText } from "@/domain/markdown-pages";
import styles from "./PasteNotes.module.css";

/**
 * Notes can be pasted instead of uploaded: it becomes the same Markdown file a Notion export would be.
 * Headings are used when there are any; plain text is split by its short title lines, or kept as one topic.
 */
export function PasteNotes({ onFile, disabled = false }: { onFile: (file: File) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function use() {
    if (!text.trim()) return setError("Paste your notes first.");
    const heading = pastedTitle(text);
    // The title names the course; left in, it would become an empty first page of the notes.
    const body = heading ? text.replace(/^\s*(?:#\s+)?[^\n]*\n/, "") : text;
    const value = structurePastedText(body);
    if (new Blob([value]).size > MAX_NOTES_BYTES) return setError("These notes are over 2 MB. Paste a smaller part.");
    setError("");
    // A title line at the top names the file, and so the course: "Cell biology", not "My course".
    const title = heading?.replace(/[\\/:*?"<>|]+/g, " ").trim();
    onFile(new File([value], `${title || "Pasted notes"}.md`, { type: "text/markdown" }));
  }

  return (
    <details className={styles.paste}>
      <summary>Or paste your notes</summary>
      <p className={styles.help}>
        <span className={styles.works}>
          Works with
          <span className="brand-inline"><BrandIcon brand="notion" size={14} />Notion</span>
          <span className="brand-inline"><BrandIcon brand="obsidian" size={14} />Obsidian</span>
          <span className="brand-inline"><BrandIcon brand="markdown" size={15} />Markdown</span>
        </span>
        In Notion, use Export, then Markdown, or copy the page and paste it here.
      </p>
      <label htmlFor="paste-notes" className="sr-only">Your notes</label>
      <textarea
        id="paste-notes"
        value={text}
        rows={8}
        disabled={disabled}
        onChange={(event) => { setText(event.target.value); setError(""); }}
        placeholder={"# Osmosis\nThe movement of water across a membrane…\n\n# Active transport\nUses ATP to move substances…"}
      />
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {/* While Kelus reads them the button says so, right where the learner is looking. */}
      <button type="button" className={`k-btn ${styles.use}`} onClick={use} disabled={disabled || !text.trim()} aria-busy={disabled && Boolean(text.trim()) ? true : undefined}>{disabled && text.trim() ? <><span className={styles.spinner} aria-hidden="true" />Finding your topics…</> : "Use these notes"}</button>
    </details>
  );
}
