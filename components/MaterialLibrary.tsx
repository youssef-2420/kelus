"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import type { CourseMaterial, MaterialRole, ProposedConcept } from "@/domain/types";
import { MATERIAL_ROLES, materialRoleLabel } from "@/domain/materials";
import { proposeConceptsFromPages } from "@/domain/material-intelligence";
import {
  addLinkMaterial,
  addPdfMaterial,
  getMaterialsSnapshot,
  getServerMaterialsSnapshot,
  readLocalPdf,
  removeMaterial,
  subscribeMaterials,
  updateMaterialProcessingStatus,
} from "@/lib/material-store";
import { extractPdfPages } from "@/lib/pdf-extraction";

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

function MaterialRow({ item, onAnalyze }: { item: CourseMaterial; onAnalyze: (item: CourseMaterial) => void }) {
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
      <span className="material-kind">{materialRoleLabel(item.role)}</span>
      <span className="material-name">
        <strong>{item.title}</strong>
        <small>{item.storage === "local" ? [item.fileName, formatBytes(item.sizeBytes)].filter(Boolean).join(" · ") : sourceHost(item.sourceUrl)}</small>
      </span>
      <span className="material-actions">
        {item.storage === "local" ? <button type="button" onClick={() => onAnalyze(item)} disabled={busy || item.processingStatus === "processing"}>{item.processingStatus === "processing" ? "Reading…" : item.processingStatus === "ready" ? "Review concepts" : "Build concepts"}</button> : null}
        {item.storage === "url" ? <a href={item.sourceUrl ?? "#"} target="_blank" rel="noreferrer">Open</a> : <button type="button" onClick={downloadPdf} disabled={busy}>{busy ? "Preparing…" : "Download"}</button>}
        <button type="button" onClick={remove} disabled={busy}>Remove</button>
      </span>
    </li>
  );
}

export function MaterialLibrary() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { state, confirmConcepts } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [role, setRole] = useState<MaterialRole>("notes");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState<{ material: CourseMaterial; proposals: ProposedConcept[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const course = state.snapshot.courses[0];

  if (!state.onboardingCompleted || !course) {
    return <AppShell><section className="materials-empty"><p className="kicker">Course material</p><h1>Set a destination first.</h1><p>Kelus needs a course before it can keep sources with it.</p><Link className="cta" href="/today">Set destination <span aria-hidden="true">→</span></Link></section></AppShell>;
  }

  const courseMaterials = materials.filter((item) => item.courseId === course.id);

  async function analyzePdf(material: CourseMaterial, file?: File) {
    setError(null);
    setBusy(true);
    updateMaterialProcessingStatus(material.id, "processing");
    try {
      const stored = file ?? await readLocalPdf(material.id);
      if (!stored) throw new Error("This PDF is no longer available on this device. Add it again to continue.");
      const pages = await extractPdfPages(stored instanceof File ? stored : new File([stored], material.fileName ?? `${material.title}.pdf`, { type: material.mimeType ?? "application/pdf" }));
      const proposals = proposeConceptsFromPages({ materialId: material.id, sourceLabel: material.title, pages });
      if (!proposals.length) throw new Error("Kelus could not find clear concept headings in this PDF. Try a syllabus or lecture deck with selectable text.");
      updateMaterialProcessingStatus(material.id, "ready");
      setAnalysis({ material: { ...material, processingStatus: "ready" }, proposals });
      setSelectedIds(new Set(proposals.map((proposal) => proposal.id)));
      setDraftNames(Object.fromEntries(proposals.map((proposal) => [proposal.id, proposal.name])));
    } catch (caught) {
      updateMaterialProcessingStatus(material.id, "failed");
      setError(caught instanceof Error ? caught.message : "Kelus could not read this PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function savePdf(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const material = await addPdfMaterial({ courseId: course.id, file, role });
      await analyzePdf(material, file);
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
      addLinkMaterial({ courseId: course.id, title, value: url, role });
      setTitle("");
      setUrl("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The link could not be saved.");
    }
  }

  function toggleProposal(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function buildMap() {
    if (!analysis) return;
    const selected = analysis.proposals
      .filter((proposal) => selectedIds.has(proposal.id))
      .map((proposal) => ({ ...proposal, name: draftNames[proposal.id]?.trim() || proposal.name }));
    try {
      const normalizedNames = selected.map((proposal) => proposal.name.toLocaleLowerCase());
      if (new Set(normalizedNames).size !== normalizedNames.length) {
        throw new Error("Each confirmed concept needs a distinct name.");
      }
      confirmConcepts(selected);
      router.push("/map");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kelus could not build the map.");
    }
  }

  return (
    <AppShell>
      <header className="materials-head">
        <div><p className="kicker">{course.name}</p><h1>Course material</h1></div>
        <p>Keep the sources that define this exam together. Add PDFs from your device or save useful video and web links.</p>
      </header>

      <section className="material-ingest" aria-labelledby="add-material-title">
        <div className="material-ingest-title"><p className="kicker">Add material</p><h2 id="add-material-title">Bring the course into one place.</h2></div>
        <div className="material-role-field">
          <label htmlFor="material-role">This source is</label>
          <select id="material-role" value={role} onChange={(event) => setRole(event.target.value as MaterialRole)}>
            {MATERIAL_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p>PDFs are read on this device. You confirm every proposed concept before it changes your route.</p>
        </div>
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
          <div><label htmlFor="material-title">Title <span>optional</span></label><input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Week 3 lecture notes" /></div>
          <div className="material-url-field"><label htmlFor="material-url">Video or web link</label><input id="material-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" inputMode="url" /></div>
          <button className="cta" type="submit" disabled={!url.trim()}>Add link</button>
        </form>
        <p className="material-error" role="alert">{error ?? ""}</p>
      </section>

      <AnimatePresence initial={false}>
        {analysis ? (
          <motion.section
            className="concept-confirmation"
            aria-labelledby="concept-confirmation-title"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <header>
              <div><p className="kicker">Confirm the course structure</p><h2 id="concept-confirmation-title">Kelus found {analysis.proposals.length} proposed concepts.</h2></div>
              <p>Keep only the concepts this exam actually covers. Each one retains the page where Kelus found it.</p>
            </header>
            <ol className="concept-proposal-list">
              {analysis.proposals.map((proposal, index) => (
                <li key={proposal.id} className={selectedIds.has(proposal.id) ? "is-selected" : undefined}>
                  <label>
                    <input type="checkbox" checked={selectedIds.has(proposal.id)} onChange={() => toggleProposal(proposal.id)} />
                    <span className="proposal-index">{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <input
                        className="proposal-name-input"
                        value={draftNames[proposal.id] ?? proposal.name}
                        onChange={(event) => setDraftNames((current) => ({ ...current, [proposal.id]: event.target.value }))}
                        aria-label={`Concept name from ${proposal.locator}`}
                      />
                      <small>{analysis.material.title} · {proposal.locator}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ol>
            <div className="concept-confirmation-actions">
              <button type="button" className="text-btn" onClick={() => setAnalysis(null)}>Review later</button>
              <button type="button" className="cta" disabled={!selectedIds.size} onClick={buildMap}>Build my Knowledge Map <span aria-hidden="true">→</span></button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="material-shelf" aria-labelledby="source-shelf-title">
        <header><div><p className="kicker">Source shelf</p><h2 id="source-shelf-title">{courseMaterials.length ? `${courseMaterials.length} saved` : "Nothing saved yet"}</h2></div><span>This device</span></header>
        {courseMaterials.length ? <ul>{courseMaterials.map((item) => <MaterialRow key={item.id} item={item} onAnalyze={(material) => void analyzePdf(material)} />)}</ul> : <p className="material-shelf-empty">Start with the syllabus or the lecture you are studying now.</p>}
      </section>

      <aside className="material-honesty">
        <p className="kicker">Local and reviewable</p>
        <p>PDF text and files stay on this device. Kelus uses only the concepts you confirm, and every learning activity keeps its source page visible.</p>
      </aside>
    </AppShell>
  );
}
