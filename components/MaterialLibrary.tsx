"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { useLearner } from "@/components/LearnerProvider";
import { PAYWALL_DISMISS_KEY, SoftUpgradePrompt } from "@/components/SoftUpgradePrompt";
import { trackEvent } from "@/lib/analytics";
import type { CourseMaterial, MaterialRole, ProposedConcept } from "@/domain/types";
import { MATERIAL_ROLES, materialRoleLabel } from "@/domain/materials";
import { buildConfirmedMaterialModel, proposeConceptsFromMetadata, proposeConceptsFromPages } from "@/domain/material-intelligence";
import {
  addLinkMaterial,
  addPdfMaterial,
  getMaterialsSnapshot,
  getServerMaterialsSnapshot,
  removeMaterial,
  subscribeMaterials,
  updateMaterialProcessingStatus,
} from "@/lib/material-store";
import { readMaterialPdf, removeRemoteMaterial, uploadMaterialPdf } from "@/lib/material-sync";
import {
  INITIAL_INGEST_STATE,
  defaultStepMessage,
  errorKind as ingestErrorKind,
  errorMessage as ingestErrorMessage,
  focusTargetId,
  isBusy,
  isDragging,
  isOcrRunning,
  readySummary as ingestReadySummary,
  reduceIngest,
  reviewAnalysis,
  showIngestForm,
  statusMessage as ingestStatusMessage,
  type IngestState,
  type WorkingStep,
} from "@/lib/material-ingest-machine";
import { assessPdfTextQuality, extractPdfPages, ocrPdfPages, pageNeedsOcr } from "@/lib/pdf-extraction";

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

function MaterialRow({ item, onAnalyze, userId, syncState }: { item: CourseMaterial; onAnalyze: (item: CourseMaterial) => void; userId?: string; syncState?: "syncing" | "synced" | "retrying" }) {
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadPdf() {
    setBusy(true);
    setDownloadError(null);
    const blob = await readMaterialPdf(item.id, userId);
    setBusy(false);
    if (!blob) {
      setDownloadError("PDF isn’t available on this device anymore. Add the file again to download it.");
      return;
    }
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
    if (userId) await removeRemoteMaterial(userId, item.id).catch(() => undefined);
  }

  const statusLabel =
    item.processingStatus === "failed"
      ? "Failed"
      : item.processingStatus === "processing"
        ? "Reading…"
        : item.processingStatus === "ready"
          ? "Ready"
          : null;

  return (
    <li className={`material-row${item.processingStatus === "failed" ? " is-failed" : ""}`}>
      <span className="material-kind">{materialRoleLabel(item.role)}</span>
      <span className="material-name">
        <strong>{item.title}</strong>
        <small>
          {item.storage === "local"
            ? [item.fileName, formatBytes(item.sizeBytes)].filter(Boolean).join(" · ")
            : `Bookmark · ${sourceHost(item.sourceUrl)}`}
        </small>
        {statusLabel ? <small className={`material-status-badge is-${item.processingStatus}`}>{statusLabel}</small> : null}
        {userId ? <small className={`material-sync-label is-${syncState ?? "synced"}`}>{syncState === "syncing" ? "Saving across devices…" : syncState === "retrying" ? "Saved here · cloud retry queued" : "Saved across devices"}</small> : <small className="material-sync-label">Saved on this device</small>}
        {downloadError ? <small className="material-download-error" role="alert">{downloadError}</small> : null}
      </span>
      <span className="material-actions">
        {item.storage === "local" ? <button type="button" onClick={() => onAnalyze(item)} disabled={busy || item.processingStatus === "processing"}>{item.processingStatus === "processing" ? "Reading…" : item.processingStatus === "failed" ? "Retry concepts" : item.processingStatus === "ready" ? "Review concepts" : "Build concepts"}</button> : null}
        {item.storage === "url" ? (
          item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open bookmark</a> : null
        ) : (
          <button type="button" onClick={() => void downloadPdf()} disabled={busy}>{busy ? "Preparing…" : "Download"}</button>
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
  const auth = useAuth();
  const { state, confirmConcepts, useDemo: loadDemo } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [role, setRole] = useState<MaterialRole>("notes");
  const [ingest, setIngest] = useState<IngestState>(INITIAL_INGEST_STATE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [syncStates, setSyncStates] = useState<Record<string, "syncing" | "synced" | "retrying">>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const ocrAbortRef = useRef<AbortController | null>(null);
  const course = state.snapshot.courses[0];

  const dispatch = (event: Parameters<typeof reduceIngest>[1]) => {
    setIngest((current) => reduceIngest(current, event));
  };

  const phase = ingest.phase;
  const busy = isBusy(phase);
  const ocrRunning = isOcrRunning(phase);
  const dragging = isDragging(phase);
  const analysis = reviewAnalysis(phase);
  const readySummary = ingestReadySummary(phase);
  const statusMessage = ingestStatusMessage(phase);
  const hardError = ingestErrorMessage(phase);
  const softNotice = ingest.softNotice;
  const errorKind = ingestErrorKind(phase);
  const workingStep = phase.status === "working" ? phase.step : null;

  const WORKING_STEPS: WorkingStep[] = ["saving", "extracting", "ocr", "building"];
  const workingStepLabel: Record<WorkingStep, string> = {
    saving: "Saving",
    extracting: "Reading",
    ocr: "Scanning",
    building: "Building",
  };

  useEffect(() => {
    const id = focusTargetId(phase);
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  if (!state.onboardingCompleted || !course) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Course material</p>
          <h1>Set your exam first.</h1>
          <p>Kelus needs a course and exam before it can keep sources with it.</p>
          <Link className="cta" href="/today">
            Set your exam <span aria-hidden="true">→</span>
          </Link>
        </section>
      </AppShell>
    );
  }

  const courseMaterials = materials.filter((item) => item.courseId === course.id);
  const concepts = state.snapshot.concepts.filter((item) => item.courseId === course.id);

  function cancelOcr() {
    ocrAbortRef.current?.abort();
  }

  async function analyzePdf(material: CourseMaterial, file?: File) {
    dispatch({ type: "CLEAR_FEEDBACK" });
    dispatch({ type: "WORK_STARTED", step: "extracting", message: defaultStepMessage("extracting") });
    updateMaterialProcessingStatus(material.id, "processing");
    ocrAbortRef.current?.abort();
    const controller = new AbortController();
    ocrAbortRef.current = controller;
    let attemptedOcr = false;
    try {
      const stored = file ?? await readMaterialPdf(material.id, auth.user?.id);
      if (!stored) throw new Error("This PDF is no longer available on this device. Add it again to continue.");
      const pdfFile = stored instanceof File ? stored : new File([stored], material.fileName ?? `${material.title}.pdf`, { type: material.mimeType ?? "application/pdf" });
      dispatch({ type: "WORK_STEP", step: "extracting", message: defaultStepMessage("extracting") });
      let pages = await extractPdfPages(pdfFile, { maxContentPages: 16 });
      let quality = assessPdfTextQuality(pages);
      let usedOcr = false;
      let proposals: ProposedConcept[] = [];

      function mergeProposals(extra: ProposedConcept[]) {
        const seen = new Set(proposals.map((item) => item.name.toLocaleLowerCase()));
        for (const item of extra) {
          const key = item.name.toLocaleLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          proposals.push(item);
        }
      }

      proposals = proposeConceptsFromPages({ materialId: material.id, sourceLabel: material.title, pages });
      if (proposals.length < 3) {
        mergeProposals(proposeConceptsFromPages({
          materialId: material.id,
          sourceLabel: material.title,
          pages,
          mode: "relaxed",
        }));
      }
      if (proposals.length < 3) {
        mergeProposals(proposeConceptsFromMetadata({
          materialId: material.id,
          sourceLabel: material.title,
          fileName: material.fileName,
        }));
      }

      async function runOcr(reason: string) {
        attemptedOcr = true;
        dispatch({ type: "WORK_STEP", step: "ocr", message: reason });
        const ocr = await ocrPdfPages(pdfFile, pages, {
          maxPages: 8,
          timeBudgetMs: 45_000,
          scale: 1.5,
          stopAfterRecoveredPages: 4,
          signal: controller.signal,
          onProgress: (progress) => dispatch({ type: "WORK_PROGRESS", message: progress.message }),
        });
        if (ocr.ocrPages > 0) {
          pages = ocr.pages;
          quality = assessPdfTextQuality(pages);
          usedOcr = true;
        }
        return ocr;
      }

      const needsScanHelp = quality.density === "sparse" || quality.density === "empty" || pages.some(pageNeedsOcr);
      if (proposals.length < 3 && needsScanHelp) {
        const ocrResult = await runOcr("Scanned or weak PDF text — reading pages with on-device OCR…");
        if (ocrResult.ocrPages === 0 && quality.density === "empty") {
          const ocrError = new Error(
            ocrResult.timedOut
              ? "Scan reading hit the time limit before usable English text appeared. Export a text PDF, try a clearer scan, or continue with the sample course."
              : "On-device OCR finished without usable English text. Export a text PDF, try a clearer English scan, or continue with the sample course.",
          );
          (ocrError as Error & { kind?: string }).kind = "ocr";
          throw ocrError;
        }
        dispatch({
          type: "WORK_STEP",
          step: "building",
          message: usedOcr ? "Building concepts from scanned text…" : defaultStepMessage("building"),
        });
        proposals = proposeConceptsFromPages({ materialId: material.id, sourceLabel: material.title, pages });
        if (proposals.length < 3) {
          mergeProposals(proposeConceptsFromPages({
            materialId: material.id,
            sourceLabel: material.title,
            pages,
            mode: "relaxed",
          }));
        }
        if (proposals.length < 3) {
          mergeProposals(proposeConceptsFromMetadata({
            materialId: material.id,
            sourceLabel: material.title,
            fileName: material.fileName,
          }));
        }
      } else {
        dispatch({ type: "WORK_STEP", step: "building", message: defaultStepMessage("building") });
      }

      if (!proposals.length) {
        const emptyScan = attemptedOcr && quality.density === "empty";
        const fail = new Error(
          emptyScan
            ? "Kelus still could not recover usable English text from this scan. Try a clearer export, or use the sample course to see the loop."
            : "Kelus could not find clear concept headings in this PDF. Try a syllabus or lecture deck with selectable text.",
        );
        if (emptyScan) (fail as Error & { kind?: string }).kind = "ocr";
        throw fail;
      }
      updateMaterialProcessingStatus(material.id, "ready");
      const nextAnalysis = { material: { ...material, processingStatus: "ready" as const }, proposals, pages };
      dispatch({ type: "REVIEW_READY", analysis: nextAnalysis });
      trackEvent({ name: "concept_review_started", concept_count: proposals.length });
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
      if (caught instanceof Error && caught.name === "AbortError") {
        dispatch({
          type: "FAIL",
          kind: "ocr",
          message: "OCR cancelled. You can retry this file, export a text PDF, or try the sample course.",
        });
      } else {
        const kind = caught instanceof Error && (caught as Error & { kind?: string }).kind === "ocr" ? "ocr" : "generic";
        dispatch({
          type: "FAIL",
          kind,
          message: caught instanceof Error ? caught.message : "Kelus could not read this PDF.",
        });
      }
    } finally {
      if (ocrAbortRef.current === controller) ocrAbortRef.current = null;
    }
  }

  async function savePdf(file: File | undefined) {
    if (!file) return;
    trackEvent({ name: "material_upload_started", role });
    if (file.size > 20 * 1024 * 1024) {
      dispatch({
        type: "SIZE_REJECTED",
        message: "This PDF is larger than 20 MB. Export a smaller file, or split it, then try again.",
      });
      return;
    }
    dispatch({ type: "WORK_STARTED", step: "saving", message: defaultStepMessage("saving") });
    try {
      const material = await addPdfMaterial({ courseId: course.id, file, role });
      trackEvent({ name: "material_upload_completed", role });
      if (auth.user?.id) {
        setSyncStates((current) => ({ ...current, [material.id]: "syncing" }));
        void uploadMaterialPdf(auth.user.id, material, file).then(() => {
          setSyncStates((current) => ({ ...current, [material.id]: "synced" }));
        }).catch(() => {
          setSyncStates((current) => ({ ...current, [material.id]: "retrying" }));
          dispatch({
            type: "SOFT_NOTICE",
            message: "The PDF is ready here. Its encrypted account copy will retry when the connection returns.",
          });
        });
      }
      await analyzePdf(material, file);
    } catch (caught) {
      trackEvent({ name: "material_upload_failed", role });
      dispatch({
        type: "FAIL",
        kind: "generic",
        message: caught instanceof Error ? caught.message : "The PDF could not be saved.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    dispatch({ type: "DROP_RESET" });
    void savePdf(event.dataTransfer.files[0]);
  }

  function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "CLEAR_FEEDBACK" });
    try {
      addLinkMaterial({ courseId: course.id, title, value: url, role });
      setTitle("");
      setUrl("");
    } catch (caught) {
      dispatch({
        type: "LINK_FAILED",
        message: caught instanceof Error ? caught.message : "The link could not be saved. Check the URL and try again.",
      });
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
      dispatch({
        type: "CONFIRM",
        conceptCount: selected.length,
        firstName: first?.name ?? selected[0]?.name ?? null,
      });
    } catch (caught) {
      dispatch({
        type: "CONFIRM_FAILED",
        message: caught instanceof Error ? caught.message : "Kelus could not build the map. Check concept names and try again.",
      });
    }
  }

  return (
    <AppShell>
      <header className="materials-head">
        <div><p className="kicker">{course.name}</p><h1>Course material</h1></div>
        <p>Add the lessons you want to revise for this exam. PDFs supply proposed revision topics; links are bookmarks only.</p>
      </header>

      {showUpgrade ? <SoftUpgradePrompt moment="third_material" /> : null}

      <section className="material-ingest" aria-labelledby="add-material-title" hidden={!showIngestForm(phase)}>
        <div className="material-ingest-title"><p className="kicker">Add material</p><h2 id="add-material-title">Bring the course into one place.</h2></div>
        <div className="material-role-field">
          <label htmlFor="material-role">This source is</label>
          <select id="material-role" value={role} onChange={(event) => setRole(event.target.value as MaterialRole)} disabled={busy}>
            {MATERIAL_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p>
            Clear, text-based PDFs work fastest. Kelus can also read many scanned English pages. You review every
            suggested topic before it changes your revision route. For scans, Kelus checks up to the first 8 pages on this device.
          </p>
        </div>
        <label
          className={`material-drop${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}`}
          aria-busy={busy || undefined}
          onDragEnter={() => dispatch({ type: "DRAG_ENTER" })}
          onDragLeave={() => dispatch({ type: "DRAG_LEAVE" })}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(event) => void savePdf(event.target.files?.[0])} disabled={busy} />
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 33V10m0 0-8 8m8-8 8 8M10 31v7h28v-7" /></svg>
          <strong>{busy ? (statusMessage ?? "Working on your PDF…") : "Drop a PDF here"}</strong>
          <span>{busy && statusMessage ? statusMessage : "or choose a file · up to 20 MB · clear text works fastest"}</span>
        </label>
        {busy && workingStep ? (
          <div className="material-work-status" role="status" aria-live="polite">
            <ol className="material-work-steps" aria-label="PDF processing steps">
              {WORKING_STEPS.map((step) => {
                const currentIndex = WORKING_STEPS.indexOf(workingStep);
                const stepIndex = WORKING_STEPS.indexOf(step);
                const state = stepIndex < currentIndex ? "done" : stepIndex === currentIndex ? "current" : "todo";
                return (
                  <li key={step} className={`is-${state}`} aria-current={state === "current" ? "step" : undefined}>
                    {workingStepLabel[step]}
                  </li>
                );
              })}
            </ol>
            <p>{statusMessage ?? defaultStepMessage(workingStep)}</p>
            {ocrRunning ? (
              <button type="button" className="text-btn" onClick={cancelOcr}>Cancel OCR</button>
            ) : null}
          </div>
        ) : null}

        <details className="material-bookmarks"><summary>Save a video or web link instead</summary>
        <form className="material-link-form" onSubmit={addLink}>
          <div><label htmlFor="material-title">Title <span>optional</span></label><input id="material-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Week 3 lecture video" disabled={busy} /></div>
          <div className="material-url-field"><label htmlFor="material-url">Bookmark a video or web link</label><input id="material-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" inputMode="url" disabled={busy} /></div>
          <button className="cta" type="submit" disabled={!url.trim() || busy}>Save bookmark</button>
        </form>
        <p className="material-link-hint">
          Bookmarks stay on your shelf for quick open. They do not become concepts — upload a PDF for that.
        </p>
        </details>
        {errorKind === "ocr" ? (
          <div className="material-error-rescue" role="group" aria-label="Ways to continue after OCR">
            <p>
              OCR works best on clear English scans. Export a text PDF from your notes app, try a sharper scan, or
              continue with the sample course.
            </p>
            <div className="material-error-actions">
              <button type="button" className="text-btn" onClick={() => loadDemo()}>Try the sample course</button>
              <a className="text-btn" href="#source-shelf-title">Retry with another file</a>
            </div>
          </div>
        ) : null}
        {errorKind === "generic" ? (
          <div className="material-error-actions">
            <button type="button" className="text-btn" onClick={() => loadDemo()}>Try the sample course</button>
            <a className="text-btn" href="#source-shelf-title">Choose another file</a>
          </div>
        ) : null}
      </section>

      {hardError ? <p className="material-error" role="alert">{hardError}</p> : null}
      {softNotice && !hardError ? <p className="material-error is-soft" role="status">{softNotice}</p> : null}
      <AnimatePresence initial={false} mode="wait">
        {readySummary ? (
          <motion.section
            key="material-ready"
            className="material-ready"
            aria-labelledby="material-ready-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? kelusDuration.micro : kelusDuration.normal, ease: kelusEase }}
          >
            <p className="kicker">You’re ready</p>
            <h2 id="material-ready-title" tabIndex={-1}>
              {readySummary.conceptCount} confirmed concept{readySummary.conceptCount === 1 ? "" : "s"} from your file.
            </h2>
            <p>
              Your topics are saved. Next, check what you remember so Kelus can suggest where to begin. You can inspect the map whenever you need it.</p>
            <div className="material-ready-actions">
              <Link className="cta" href="/today">Continue: short check, then study <span aria-hidden="true">→</span></Link>
              <Link className="text-btn" href="/map">Review the map</Link>
              <button type="button" className="text-btn" onClick={() => dispatch({ type: "ADD_ANOTHER" })}>Add another source</button>
            </div>
          </motion.section>
        ) : null}
        {analysis ? (
          <motion.section
            key="concept-confirmation"
            className="concept-confirmation"
            aria-labelledby="concept-confirmation-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? kelusDuration.micro : kelusDuration.normal, ease: kelusEase }}
          >
            <header>
              <div><p className="kicker">Review your topics</p><h2 id="concept-confirmation-title" tabIndex={-1}>Kelus found {analysis.proposals.length} proposed concepts.</h2></div>
              <p>
                Keep only the concepts this exam actually covers. Each one retains the page where Kelus found it.
                {state.diagnosisCompleted
                  ? " Confirming a new set replaces your current map and asks you to redo the short familiarity check."
                  : null}
              </p>
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
              <button type="button" className="text-btn" onClick={() => dispatch({ type: "REVIEW_LATER" })}>Review later</button>
              <button type="button" className="cta" disabled={!selectedIds.size} onClick={buildMap}>Build my Knowledge Map <span aria-hidden="true">→</span></button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="material-shelf" aria-labelledby="source-shelf-title">
        <header><div><p className="kicker">Source shelf</p><h2 id="source-shelf-title">{courseMaterials.length ? `${courseMaterials.length} saved` : concepts.length ? "Sample model ready" : "Nothing saved yet"}</h2></div><span>This device</span></header>
        {courseMaterials.length ? (
          <ul>{courseMaterials.map((item) => <MaterialRow key={item.id} item={item} userId={auth.user?.id} syncState={syncStates[item.id]} onAnalyze={(material) => void analyzePdf(material)} />)}</ul>
        ) : concepts.length ? (
          <div className="material-shelf-empty">
            <p>Sample course model is loaded — concepts are ready without a PDF on this shelf. Add your own syllabus when you want Kelus grounded in your files.</p>
            <Link className="cta" href="/today">
              Continue to Today <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div className="material-shelf-empty">
            <p>Start with the syllabus or the lecture you are studying now — or try the sample in about a minute.</p>
            <button type="button" className="cta" onClick={() => loadDemo()}>
              Try sample (~1 min) <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </section>

      <aside className="material-honesty">
        <p className="kicker">Private and reviewable</p>
        <p>{auth.user ? "Signed-in materials are stored in your private Kelus account and cached on this device. " : "Materials stay on this device until you sign in. "}Kelus uses only the concepts you confirm, and every learning activity keeps its source page visible.</p>
      </aside>
    </AppShell>
  );
}
