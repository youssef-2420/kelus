"use client";

import { useRef, useState } from "react";
import styles from "./InlineName.module.css";

/**
 * A name you can change where it stands, like a page title in Notion: click it, type, Enter or click away to keep,
 * Esc to leave it as it was. It looks like plain text until you point at it.
 */
export function InlineName({ value, onSave, label, className }: { value: string; onSave: (next: string) => void; label: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);

  function start() {
    setDraft(value);
    setEditing(true);
    requestAnimationFrame(() => input.current?.select());
  }

  function finish(save: boolean) {
    setEditing(false);
    const next = draft.trim();
    if (save && next && next !== value) onSave(next);
  }

  if (editing) {
    return (
      <input
        ref={input}
        className={`${styles.input} ${className ?? ""}`}
        value={draft}
        aria-label={label}
        maxLength={90}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); finish(true); }
          if (event.key === "Escape") { event.preventDefault(); finish(false); }
        }}
      />
    );
  }
  return (
    <button type="button" className={`${styles.name} ${className ?? ""}`} onClick={start} title={`Rename · ${label}`} aria-label={`${value}. ${label}`}>
      {value}
    </button>
  );
}
