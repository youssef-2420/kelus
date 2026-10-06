"use client";

import { useState, type DragEvent } from "react";
import { SourceArt } from "@/components/SourceArt";
import { PackArt } from "@/components/PackArt";
import { PasteNotes } from "@/components/PasteNotes";
import { MAX_NOTES_BYTES } from "@/domain/markdown-pages";
import { SOURCE_FILE_ACCEPT, isNotesFile, isSourceFile, isZipFile } from "@/domain/materials";
import { addSourceMaterial } from "@/lib/material-store";
import { zipToNotesFile } from "@/lib/zip-notes";

/**
 * A course with no topics yet is one screen with one job: add your notes. Everything after that
 * (reading, topic review, today's plan) is the same flow as the first time.
 */
export function EmptyCourse({ courseId, courseName }: { courseId: string; courseName?: string }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function take(picked: File | undefined) {
    setDragging(false);
    if (!picked || busy) return;
    if (!isSourceFile(picked)) return setError("Choose a PDF, notes as a .md or .txt file, or a Notion export (.zip).");
    setBusy(true);
    setError("");
    try {
      const file = isZipFile(picked) ? await zipToNotesFile(picked) : picked;
      if (isNotesFile(file) && file.size > MAX_NOTES_BYTES) throw new Error("These notes are over 2 MB. Choose a smaller file or split them.");
      if (!isNotesFile(file) && file.size > 20 * 1024 * 1024) throw new Error("This PDF is over 20 MB. Choose a smaller export or split it first.");
      const role = /syllabus|outline/i.test(file.name) ? "syllabus" : /slides|lecture/i.test(file.name) ? "lecture_slides" : "notes";
      await addSourceMaterial({ courseId, file, role });
      // The page now has a source, so the topic review takes over from here.
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "Kelus couldn’t read that file. Try another one.");
      setBusy(false);
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void take(event.dataTransfer.files[0]);
  }

  return (
    <div className="destination-page is-booklet-product is-marked-setup is-material-first">
      <div className="destination-form">
      <section className="setup-stage-content empty-course" aria-labelledby="empty-course-title">
        <p className="kicker">{courseName ? courseName : "Your course"}</p>
        <PackArt name="on-the-laptop" className="empty-course-art" size={230} />
        <h1 id="empty-course-title" className="destination-page-title">Add your notes.</h1>
        <p className="destination-support">Drop a PDF, a Notion export, or paste text. Kelus finds the topics and builds today’s plan. You review them before anything changes.</p>
        <label
          className={`setup-first-upload${dragging ? " is-dragging" : ""}`}
          aria-busy={busy || undefined}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          <input type="file" accept={SOURCE_FILE_ACCEPT} disabled={busy} onChange={(event) => { void take(event.target.files?.[0]); event.target.value = ""; }} />
          <span className="setup-upload-mark" aria-hidden="true"><SourceArt role="lecture_slides" /></span>
          <strong>{busy ? "Reading your file…" : "Choose a PDF or notes"}</strong>
          <span>{busy ? "This takes a few seconds." : "or drop it here"}</span>
        </label>
        <PasteNotes onFile={(file) => void take(file)} disabled={busy} />
        {error ? <p className="setup-error" role="alert">{error}</p> : null}
        <p className="setup-file-help">PDF up to 20 MB (digital PDFs with selectable text work best), or notes as a Markdown or .txt file. A Notion export (Export → Markdown &amp; CSV, the .zip) works too.</p>
        <p className="setup-privacy-note">Your course stays on this device unless you choose free sign-in to sync it.</p>
      </section>
      </div>
    </div>
  );
}
