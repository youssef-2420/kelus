"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import type { CourseMaterial } from "@/domain/types";
import {
  addLinkMaterial,
  addPdfMaterial,
  getMaterialsSnapshot,
  getServerMaterialsSnapshot,
  readLocalPdf,
  removeMaterial,
  subscribeMaterials,
} from "@/lib/material-store";

function formatBytes(bytes: number | null) {
  if (bytes === null) return null;
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function sourceHost(value: string | null) {
  try {
    return new URL(value ?? "https://kelus.me").hostname.replace(/^www\./, "");
  } catch {
    return "Saved link";
  }
}

function MaterialRow({ item }: { item: CourseMaterial }) {
  const [busy, setBusy] = useState(false);

  async function downloadPdf() {
    setBusy(true);
    const blob = await readLocalPdf(item.id);
    setBusy(false);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.fileName ?? `${item.title}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    setBusy(true);
    await removeMaterial(item.id);
  }

  return (
    <li className="material-row">
      <span className="material-kind">{item.kind}</span>
      <span className="material-name">
        <strong>{item.title}</strong>
        <small>{item.storage === "local" ? [item.fileName, formatBytes(item.sizeBytes)].filter(Boolean).join(" · ") : sourceHost(item.sourceUrl)}</small>
      </span>
      <span className="material-actions">
        {item.storage === "url" ? <a href={item.sourceUrl ?? "#"} target="_blank" rel="noreferrer">Open</a> : <button type="button" onClick={downloadPdf} disabled={busy}>{busy ? "Preparing…" : "Download"}</button>}
        <button type="button" onClick={remove} disabled={busy}>Remove</button>
      </span>
    </li>
  );
}

export function MaterialLibrary() {
  const { state } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const course = state.snapshot.courses[0];

  if (!state.onboardingCompleted || !course) {
    return <AppShell><section className="materials-empty"><p className="kicker">Course material</p><h1>Set a destination first.</h1><p>Kelus needs a course before it can keep sources with it.</p><Link className="cta" href="/today">Set destination <span aria-hidden="true">→</span></Link></section></AppShell>;
  }

  const courseMaterials = materials.filter((item) => item.courseId === course.id);

  async function savePdf(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await addPdfMaterial({ courseId: course.id, file });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The PDF could not be saved.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void savePdf(event.dataTransfer.files[0]);
  }

  function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      addLinkMaterial({ courseId: course.id, title, value: url });
      setTitle("");
      setUrl("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The link could not be saved.");
    }
  }

  return (
    <AppShell>
      <header className="materials-head">
        <div><p className="kicker">{course.name}</p><h1>Course material</h1></div>
        <div className="materials-intro"><p>Keep the sources that define this exam together. Add PDFs from your device or save useful video and web links.</p><span>Saved locally · Not used for routing yet</span></div>
      </header>

      <section className="material-ingest" aria-labelledby="add-material-title">
        <div className="material-ingest-title"><p className="kicker">Add material</p><h2 id="add-material-title">Bring the course into one place.</h2></div>
        <label
          className={`material-drop${dragging ? " is-dragging" : ""}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(event) => void savePdf(event.target.files?.[0])} disabled={busy} />
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 33V10m0 0-8 8m8-8 8 8M10 31v7h28v-7" /></svg>
          <strong>{busy ? "Saving PDF…" : "Drop a PDF here"}</strong>
          <span>or choose a file · up to 20 MB</span>
        </label>

        <form className="material-link-form" onSubmit={addLink}>
          <div><label htmlFor="material-title">Title <span>optional</span></label><input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lecture 4 — Elasticity" /></div>
          <div className="material-url-field"><label htmlFor="material-url">Video or web link</label><input id="material-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" inputMode="url" /></div>
          <button className="cta" type="submit" disabled={!url.trim()}>Add link</button>
        </form>
        <p className="material-error" role="alert">{error ?? ""}</p>
      </section>

      <section className="material-shelf" aria-labelledby="source-shelf-title">
        <header><div><p className="kicker">Source shelf</p><h2 id="source-shelf-title">{courseMaterials.length ? `${courseMaterials.length} saved` : "Nothing saved yet"}</h2></div><span>This device</span></header>
        {courseMaterials.length ? <ul>{courseMaterials.map((item) => <MaterialRow key={item.id} item={item} />)}</ul> : <p className="material-shelf-empty">Start with the syllabus or the lecture you are studying now.</p>}
      </section>

    </AppShell>
  );
}
