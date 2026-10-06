"use client";

import { useState } from "react";
import { looksLikeMarkdownHeadings, MAX_NOTES_BYTES } from "@/domain/markdown-pages";
import styles from "./PasteNotes.module.css";

/**
 * Notes can be pasted instead of uploaded: it becomes the same Markdown file a Notion export would be.
 * Topics come from headings, so the box says so and checks for them before anything is saved.
 */
export function PasteNotes({ onFile, disabled = false }: { onFile: (file: File) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function use() {
    const value = text.trim();
    if (!value) return setError("Paste your notes first.");
    if (!looksLikeMarkdownHeadings(value)) return setError("Put each topic under a heading, for example “# Osmosis” or “## Cell membrane”. Kelus finds topics from headings.");
    if (new Blob([value]).size > MAX_NOTES_BYTES) return setError("These notes are over 2 MB. Paste a smaller part.");
    setError("");
    onFile(new File([value], "Pasted notes.md", { type: "text/markdown" }));
  }

  return (
    <details className={styles.paste}>
      <summary>Or paste your notes</summary>
      <p className={styles.help}>Works with Notion, Obsidian and any Markdown. In Notion, use Export, then Markdown, or copy the page and paste it here.</p>
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
      <button type="button" className={styles.use} onClick={use} disabled={disabled || !text.trim()}>Use these notes</button>
    </details>
  );
}
