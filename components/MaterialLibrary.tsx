"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useLearner } from "@/components/LearnerProvider";
import { PAYWALL_DISMISS_KEY, SoftUpgradePrompt } from "@/components/SoftUpgradePrompt";
import { trackEvent } from "@/lib/analytics";
import type { CourseMaterial, ExtractedMaterialPage, MaterialRole, ProposedConcept } from "@/domain/types";
import { MATERIAL_ROLES, materialRoleLabel } from "@/domain/materials";
import { buildConfirmedMaterialModel, proposeConceptsFromMetadata, proposeConceptsFromPages } from "@/domain/material-intelligence";
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
import { assessPdfTextQuality, extractPdfPages, ocrPdfPages } from "@/lib/pdf-extraction";

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
  const [confirmRemove, setConfirmRemove] = useState(false);

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
        {item.storage === "url" ? (
          item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open</a> : null
        ) : (
          <button type="button" onClick={downloadPdf} disabled={busy}>{busy ? "Preparing…" : "Download"}</button>
        )}
        {confirmRemove ? (
          <span className="material-remove-confirm" role="group" aria-label={`Confirm remove ${item.title}`}>
            <button type="button" className="text-btn" onClick={() => setConfirmRemove(false)} disabled={busy}>Cancel</button>
            <button type="button" className="text-btn is-danger" onClick={() => void remove()} disabled={busy}>Remove</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} disabled={busy}>Remove</button>
        )}
      </span>
    </li>
  );
}

export function MaterialLibrary() {
  const reduceMotion = useReducedMotion();
  const { state, confirmConcepts, useDemo } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [role, setRole] = useState<MaterialRole>("notes");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] = useState<{ material: CourseMaterial; proposals: ProposedConcept[]; pages: ExtractedMaterialPage[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [readySummary, setReadySummary] = useState<{ conceptCount: number; firstName: string | null } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const course = state.snapshot.courses[0];

  if (!state.onboardingCompleted || !course) {
    return <AppShell><section className="materials-empty"><p className="kicker">Course material</p><h1>Set your exam first.</h1><p>Kelus needs a course and exam before it can keep sources with it.</p><Link className="cta" href="/today">Set exam <span aria-hidden="true">→</span></Link></section></AppShell>;
  }

  const courseMaterials = materials.filter((item) => item.courseId === course.id);

  async function analyzePdf(material: CourseMaterial, file?: File) {
    setError(null);
    setBusy(true);
    updateMaterialProcessingStatus(material.id, "processing");
    try {
      const stored = file ?? await readLocalPdf(material.id);
      if (!stored) throw new Error("This PDF is no longer available on this device. Add it again to continue.");
      const pdfFile = stored instanceof File ? stored : new File([stored], material.fileName ?? `${material.title}.pdf`, { type: material.mimeType ?? "application/pdf" });
      setStatusMessage("Reading PDF text…");
      let pages = await extractPdfPages(pdfFile);
      let quality = assessPdfTextQuality(pages);
      let usedOcr = false;
      if (quality.density === "sparse" || quality.density === "empty") {
        setStatusMessage("Scanned PDF detected — reading pages with on-device OCR…");
        const ocr = await ocrPdfPages(pdfFile, pages, {
          maxPages: 8,
          onProgress: (progress) => setStatusMessage(progress.message),
        });
        if (ocr.ocrPages > 0) {
          pages = ocr.pages;
          quality = assessPdfTextQuality(pages);
          usedOcr = true;
        }
      }
      setStatusMessage(usedOcr ? "Building concepts from scanned text…" : "Building concepts…");
      let proposals = proposeConceptsFromPages({ materialId: material.id, sourceLabel: material.title, pages });
      if (proposals.length < 3 && (quality.density === "sparse" || quality.density === "empty")) {
        const relaxed = proposeConceptsFromPages({
          materialId: material.id,
          sourceLabel: material.title,
          pages,
          mode: "relaxed",
        });
        const seen = new Set(proposals.map((item) => item.name.toLocaleLowerCase()));
        for (const item of relaxed) {
          const key = item.name.toLocaleLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          proposals.push(item);
        }
      }
      if (!proposals.length) {
        proposals = proposeConceptsFromMetadata({
          materialId: material.id,
          sourceLabel: material.title,
          fileName: material.fileName,
        });
      }
      if (!proposals.length) {
        throw new Error(
          quality.density === "empty"
            ? "Kelus still could not recover usable text from this scan. Try a clearer export, or use the sample course to see the loop."
            : "Kelus could not find clear concept headings in this PDF. Try a syllabus or lecture deck with selectable text.",
        );
      }
      updateMaterialProcessingStatus(material.id, "ready");
      setAnalysis({ material: { ...material, processingStatus: "ready" }, proposals, pages });
      setReadySummary(null);
      setSelectedIds(new Set(proposals.map((proposal) => proposal.id)));
      setDraftNames(Object.fromEntries(proposals.map((proposal) => [proposal.id, proposal.name])));
      if (courseMaterials.filter((item) => item.storage === "local").length >= 3) {
        try {
          if (window.localStorage.getItem(PAYWALL_DISMISS_KEY) !== "1") {
            setShowUpgrade(true);
          }
        } catch {
          setShowUpgrade(true);
        }
      }
    } catch (caught) {
      updateMaterialProcessingStatus(material.id, "failed");
      setError(caught instanceof Error ? caught.message : "Kelus could not read this PDF.");
    } finally {
      setBusy(false);
      setStatusMessage(null);
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
      const preview = buildConfirmedMaterialModel({
        proposals: selected,
        courseId: course.id,
        userId: state.snapshot.profile.id,
        nowIso: state.nowIso,
        pages: analysis.pages,
      });
      const first = [...preview.concepts].sort((left, right) => right.examImportance - left.examImportance)[0];
      confirmConcepts(selected, analysis.pages);
      trackEvent({ name: "material_confirmed", concept_count: selected.length });
      setReadySummary({
        conceptCount: selected.length,
        firstName: first?.name ?? selected[0]?.name ?? null,
      });
      setAnalysis(null);
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

      {showUpgrade ? <SoftUpgradePrompt moment="third_material" /> : null}

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
          <strong>{busy ? (statusMessage ?? "Working on your PDF…") : "Drop a PDF here"}</strong>
          <span>{busy && statusMessage ? statusMessage : "or choose a file · up to 20 MB · scans use on-device OCR"}</span>
        </label>

        <form className="material-link-form" onSubmit={addLink}>
          <div><label htmlFor="material-title">Title <span>optional</span></label><input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Week 3 lecture notes" /></div>
          <div className="material-url-field"><label htmlFor="material-url">Video or web link</label><input id="material-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" inputMode="url" /></div>
          <button className="cta" type="submit" disabled={!url.trim()}>Add link</button>
        </form>
        <p className="material-error" {...(error ? { role: "alert" } : { "aria-live": "polite" })}>{error ?? "\u00a0"}</p>
        {error ? (
          <div className="material-error-rescue" role="group" aria-label="Ways to continue">
            <p>Kelus now tries on-device OCR for scans. If that still fails, use a text PDF or try the sample course.</p>
            <div className="material-error-actions">
              <button type="button" className="text-btn" onClick={() => useDemo()}>Try the sample course</button>
              <a className="text-btn" href="#source-shelf-title">Retry with another file</a>
            </div>
          </div>
        ) : null}
      </section>

      <AnimatePresence initial={false}>
        {readySummary ? (
          <motion.section
            className="material-ready"
            aria-labelledby="material-ready-title"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="kicker">You’re ready</p>
            <h2 id="material-ready-title">
              {readySummary.conceptCount} confirmed concept{readySummary.conceptCount === 1 ? "" : "s"} from your file.
            </h2>
            <p>
              Kelus ranked them from the source itself
              {readySummary.firstName ? <> — start with <strong>{readySummary.firstName}</strong> after a ~1 minute check</> : null}.
              No invented syllabus. Next: a ~1 minute familiarity check, then your first study stop.</p>
            <div className="material-ready-actions">
              <Link className="cta" href="/today">Continue: short check, then study <span aria-hidden="true">→</span></Link>
              <Link className="text-btn" href="/map">Review the map</Link>
            </div>
          </motion.section>
        ) : null}
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
                  <div className="proposal-row">
                    <input
                      id={`proposal-${proposal.id}`}
                      type="checkbox"
                      checked={selectedIds.has(proposal.id)}
                      onChange={() => toggleProposal(proposal.id)}
                      aria-labelledby={`proposal-name-${proposal.id}`}
                    />
                    <span className="proposal-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="proposal-fields">
                      <input
                        id={`proposal-name-${proposal.id}`}
                        className="proposal-name-input"
                        value={draftNames[proposal.id] ?? proposal.name}
                        onChange={(event) => setDraftNames((current) => ({ ...current, [proposal.id]: event.target.value }))}
                        aria-label={`Concept name from ${proposal.locator}`}
                      />
                      <small>{analysis.material.title} · {proposal.locator}</small>
                    </span>
                  </div>
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
