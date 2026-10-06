"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { FirstRunGate } from "@/components/FirstRunGate";
import { useLearner } from "@/components/LearnerProvider";
import { PAYWALL_DISMISS_KEY, SoftUpgradePrompt } from "@/components/SoftUpgradePrompt";
import { trackEvent } from "@/lib/analytics";
import type { CourseMaterial, MaterialRole, ProposedConcept } from "@/domain/types";
import { MATERIAL_ROLES, materialRoleLabel } from "@/domain/materials";
import { SourceArt } from "@/components/SourceArt";

// AnimatePresence can defer mounting this heading until the previous phase exits.
// Focus on attachment, when the target actually exists, rather than on phase change.
function focusPhaseHeading(node: HTMLHeadingElement | null) {
  node?.focus();
}
import { buildConfirmedMaterialModel, isSourceBackedProposal, MAX_PROPOSED_TOPICS, proposalConfidence, proposeConceptsFromPages } from "@/domain/material-intelligence";
import {
  addLinkMaterial,
  addSourceMaterial,
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
import type { AnalysisPayload } from "@/lib/material-ingest-machine";
import { assessPdfTextQuality, ocrPdfPages, pageNeedsOcr } from "@/lib/pdf-extraction";
import { extractSourcePages, NotesWithoutHeadingsError } from "@/lib/source-extraction";
import { SOURCE_FILE_ACCEPT, isNotesFile, isZipFile, sourceNoun } from "@/domain/materials";
import { zipToNotesFile } from "@/lib/zip-notes";

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

/** What Kelus actually read, said plainly. A cut-off document must never look complete. */
function ReadCoverage({ coverage, found }: { coverage: NonNullable<AnalysisPayload["coverage"]>; found: number }) {
  const unit = coverage.unit === "section" ? "section" : "page";
  const plural = (count: number) => `${count} ${unit}${count === 1 ? "" : "s"}`;
  const all = coverage.pagesRead >= coverage.totalPages;
  return (
    <p className="read-coverage" role="status">
      {all ? `Read all ${plural(coverage.totalPages)}.` : `Read the first ${plural(coverage.pagesRead)} of ${coverage.totalPages}. Add the rest as a separate file to include it.`}
      {coverage.topicCapHit ? ` Showing the first ${found} topics; remove the ones you don’t need, or add the rest as another file.` : ""}
    </p>
  );
}

function addedLabel(iso: string) {
  const added = Date.parse(iso);
  if (!Number.isFinite(added)) return null;
  const days = Math.floor((Date.now() - added) / 86_400_000);
  if (days <= 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 7) return `Added ${days} days ago`;
  return `Added ${new Date(added).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

function MaterialRow({
  item,
  onAnalyze,
  onRemoved,
  linkedTopics,
  topicNames = [],
  userId,
  syncState,
  quiet = false,
}: {
  item: CourseMaterial;
  onAnalyze: (item: CourseMaterial) => void;
  onRemoved: (item: CourseMaterial) => void;
  linkedTopics: number;
  topicNames?: string[];
  userId?: string;
  syncState?: "syncing" | "synced" | "retrying";
  quiet?: boolean;
}) {
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
    try {
      await removeMaterial(item.id);
      onRemoved(item);
      if (userId) await removeRemoteMaterial(userId, item.id).catch(() => undefined);
    } catch {
      setDownloadError("This source could not be removed. Try again.");
      setBusy(false);
    }
  }

  const statusLabel =
    item.processingStatus === "failed"
      ? "Couldn’t read"
      : item.processingStatus === "processing"
        ? "Reading…"
        : quiet
          ? null
          : item.processingStatus === "ready"
            ? "Ready"
            : null;

  const syncLabel = !userId
    ? quiet
      ? null
      : "Saved on this device"
    : syncState === "syncing"
      ? "Saving across devices…"
      : syncState === "retrying"
        ? "Saved here · cloud retry queued"
        : quiet
          ? null
          : "Saved across devices";

  const isBuiltInExample = item.id.startsWith("material-demo-");
  const host = item.storage === "url" && item.sourceUrl ? sourceHost(item.sourceUrl) : null;
  const metaBits = item.storage === "local"
    ? [quiet ? materialRoleLabel(item.role) : null, item.fileName, formatBytes(item.sizeBytes)].filter(Boolean)
    : isBuiltInExample
      ? ["Built-in example · no original PDF"]
      : [quiet ? materialRoleLabel(item.role) : null, host ? (quiet ? `Link · ${host}` : `Bookmark · ${host}`) : "Saved link"].filter(Boolean);

  return (
    <li className={`material-row${item.processingStatus === "failed" ? " is-failed" : ""}${quiet ? " is-quiet material-card" : ""}`}>
      {quiet ? <span className="material-card-art"><SourceArt role={item.role} isLink={item.storage === "url"} /></span> : <span className="material-kind">{isBuiltInExample ? "Example" : materialRoleLabel(item.role)}</span>}
      <span className="material-name">
        <strong>{isBuiltInExample ? "Built-in Microeconomics example" : item.title}</strong>
        {metaBits.length ? <small>{metaBits.join(" · ")}</small> : null}
        {quiet && !isBuiltInExample ? (
          <small className="material-card-facts">
            {[addedLabel(item.addedAt), linkedTopics ? `${linkedTopics} topic${linkedTopics === 1 ? "" : "s"} from this source` : item.processingStatus === "ready" ? "No topics confirmed yet" : null].filter(Boolean).join(" · ")}
          </small>
        ) : null}
        {quiet && topicNames.length ? (
          <span className="material-card-chips" aria-label="Topics from this source">
            {topicNames.slice(0, 3).map((name) => <span key={name}>{name}</span>)}
            {topicNames.length > 3 ? <span>+{topicNames.length - 3} more</span> : null}
          </span>
        ) : null}
        {statusLabel ? <small className={`material-status-badge is-${item.processingStatus}`}>{statusLabel}</small> : null}
        {syncLabel ? <small className={`material-sync-label is-${syncState ?? "synced"}`}>{syncLabel}</small> : null}
        {downloadError ? <small className="material-download-error" role="alert">{downloadError}</small> : null}
      </span>
      <span className="material-actions">
        {item.storage === "local" ? (
          <button type="button" onClick={() => onAnalyze(item)} disabled={busy || item.processingStatus === "processing"}>
            {item.processingStatus === "processing"
              ? "Reading…"
              : item.processingStatus === "failed"
                ? "Retry"
                : item.processingStatus === "ready"
                  ? quiet
                    ? "Topics"
                    : "Review concepts"
                  : quiet
                    ? "Find topics"
                    : "Build concepts"}
          </button>
        ) : null}
        {item.storage === "url" ? (
          item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              {quiet ? "Open" : "Open bookmark"}
            </a>
          ) : null
        ) : (
          <button type="button" onClick={() => void downloadPdf()} disabled={busy}>
            {busy ? "Preparing…" : quiet ? (item.kind === "text" ? "File" : "PDF") : "Download"}
          </button>
        )}
        {confirmRemove ? (
          <span className="material-remove-confirm" role="group" aria-label={`Confirm remove ${item.title}`}>
            {linkedTopics ? <span>Removing this source also removes {linkedTopics} linked topic{linkedTopics === 1 ? "" : "s"} from your route.</span> : null}
            <button type="button" className="text-btn" onClick={() => setConfirmRemove(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="text-btn is-danger" onClick={() => void remove()} disabled={busy}>
              Remove
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} disabled={busy}>
            Remove
          </button>
        )}
      </span>
    </li>
  );
}

export function MaterialLibrary({ embedded = false, incomingFile = null, onIncomingFileHandled }: { embedded?: boolean; incomingFile?: File | null; onIncomingFileHandled?: () => void } = {}) {
  const reduceMotion = useReducedMotion();
  const auth = useAuth();
  const router = useRouter();
  const { state, confirmConcepts, removeMaterialSource } = useLearner();
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
  const resumedMaterialId = useRef<string | null>(null);
  const previewObjectUrl = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const course = state.snapshot.courses[0];

  useEffect(() => () => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
  }, []);

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

  const courseMaterials = materials.filter((item) => item.courseId === course?.id);
  const concepts = state.snapshot.concepts.filter((item) => item.courseId === course?.id);
  const hasCoursePdf = courseMaterials.some((item) => item.storage === "local" && !item.id.startsWith("material-demo-"));
  const sourceFirst = embedded && !hasCoursePdf && !analysis && !readySummary;

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
      if (!stored) throw new Error(material.kind === "text" ? "These notes are no longer available on this device. Add them again to continue." : "This PDF is no longer available on this device. Add it again to continue.");
      const isNotesSource = material.kind === "text";
      const pdfFile = stored instanceof File
        ? stored
        : new File([stored], material.fileName ?? `${material.title}.${isNotesSource ? "md" : "pdf"}`, { type: material.mimeType ?? (isNotesSource ? "text/markdown" : "application/pdf") });
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
      // A PDF can be opened in its own layout; notes have no separate layout, the text Kelus read is the source.
      const nextPreviewUrl = isNotesSource ? null : URL.createObjectURL(pdfFile);
      previewObjectUrl.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
      setPreviewPage(1);
      dispatch({ type: "WORK_STEP", step: "extracting", message: defaultStepMessage("extracting") });
      const extraction = await extractSourcePages(pdfFile);
      const { isNotes, locatorLabel, totalPages, pagesRead } = extraction;
      let pages = extraction.pages;
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

      proposals = proposeConceptsFromPages({ materialId: material.id, sourceLabel: material.title, pages, locatorLabel }).filter(isSourceBackedProposal);
      if (proposals.length < 3) {
        mergeProposals(proposeConceptsFromPages({
          materialId: material.id,
          sourceLabel: material.title,
          pages,
          mode: "relaxed",
          locatorLabel,
        }).filter(isSourceBackedProposal));
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

      const needsScanHelp = !isNotes && (quality.density === "sparse" || quality.density === "empty" || pages.some(pageNeedsOcr));
      if (proposals.length < 3 && needsScanHelp) {
        const ocrResult = await runOcr("Scanned or weak PDF text — reading pages with on-device OCR…");
        if (ocrResult.ocrPages === 0 && quality.density === "empty") {
          const ocrError = new Error(
            ocrResult.timedOut
              ? "Scan reading hit the time limit before usable English text appeared. Export a text PDF or try a clearer scan."
              : "On-device OCR finished without usable English text. Export a text PDF or try a clearer English scan.",
          );
          (ocrError as Error & { kind?: string }).kind = "ocr";
          throw ocrError;
        }
        dispatch({
          type: "WORK_STEP",
          step: "building",
          message: usedOcr ? "Building concepts from scanned text…" : defaultStepMessage("building"),
        });
        proposals = proposeConceptsFromPages({ materialId: material.id, sourceLabel: material.title, pages, locatorLabel }).filter(isSourceBackedProposal);
        if (proposals.length < 3) {
          mergeProposals(proposeConceptsFromPages({
            materialId: material.id,
            sourceLabel: material.title,
            pages,
            mode: "relaxed",
            locatorLabel,
          }).filter(isSourceBackedProposal));
        }
      } else {
        dispatch({ type: "WORK_STEP", step: "building", message: defaultStepMessage("building") });
      }

      if (!proposals.length) {
        const emptyScan = attemptedOcr && quality.density === "empty";
        const fail = new Error(
          emptyScan
            ? "Kelus still could not recover usable English text from this scan. Try a clearer export or another course PDF."
            : isNotes
              ? "Kelus found no topics with a supporting passage under a heading. Put each topic under its own heading (for example “## Osmosis”) with a few sentences beneath it; it will not invent a lesson from the filename."
              : "Kelus found no topics with a readable supporting passage. Try lecture notes with selectable text or a clearer scan; it will not invent a lesson from the filename.",
        );
        if (emptyScan) (fail as Error & { kind?: string }).kind = "ocr";
        throw fail;
      }
      updateMaterialProcessingStatus(material.id, "ready");
      const nextAnalysis = {
        material: { ...material, processingStatus: "ready" as const },
        proposals,
        pages,
        coverage: { totalPages, pagesRead, unit: isNotes ? ("section" as const) : ("page" as const), topicCapHit: proposals.length >= MAX_PROPOSED_TOPICS },
      };
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
          message: "OCR cancelled. You can retry this file or export a text PDF.",
        });
      } else {
        const kind = caught instanceof Error && (caught as Error & { kind?: string }).kind === "ocr" && !(caught instanceof NotesWithoutHeadingsError) ? "ocr" : "generic";
        dispatch({
          type: "FAIL",
          kind,
          message: caught instanceof Error ? caught.message : "Kelus could not read this file.",
        });
      }
    } finally {
      if (ocrAbortRef.current === controller) ocrAbortRef.current = null;
    }
  }

  async function savePdf(picked: File | undefined) {
    if (!picked || !course) return;
    let file = picked;
    if (isZipFile(picked)) {
      dispatch({ type: "WORK_STARTED", step: "saving", message: "Reading your export…" });
      try {
        file = await zipToNotesFile(picked);
      } catch (caught) {
        dispatch({ type: "FAIL", kind: "generic", message: caught instanceof Error && caught.message ? caught.message : "Kelus couldn’t read this zip. Export from Notion as Markdown & CSV and try again." });
        return;
      }
    }
    trackEvent({ name: "material_upload_started", role });
    if (file.size > 20 * 1024 * 1024) {
      dispatch({
        type: "SIZE_REJECTED",
        message: isNotesFile(file) ? "These notes are larger than 2 MB. Split them into smaller files, then try again." : "This PDF is larger than 20 MB. Export a smaller file, or split it, then try again.",
      });
      return;
    }
    dispatch({ type: "WORK_STARTED", step: "saving", message: defaultStepMessage("saving") });
    try {
      const material = await addSourceMaterial({ courseId: course.id, file, role });
      trackEvent({ name: "material_upload_completed", role });
      if (auth.user?.id) {
        setSyncStates((current) => ({ ...current, [material.id]: "syncing" }));
        void uploadMaterialPdf(auth.user.id, material, file).then(() => {
          setSyncStates((current) => ({ ...current, [material.id]: "synced" }));
        }).catch(() => {
          setSyncStates((current) => ({ ...current, [material.id]: "retrying" }));
          dispatch({
            type: "SOFT_NOTICE",
            message: `The ${sourceNoun(material.kind)} ${material.kind === "text" ? "are" : "is"} ready here. The account copy will retry when the connection returns.`,
          });
        });
      }
      await analyzePdf(material, file);
    } catch (caught) {
      trackEvent({ name: "material_upload_failed", role });
      dispatch({
        type: "FAIL",
        kind: "generic",
        message: caught instanceof Error ? caught.message : "This file could not be saved.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const handleIncomingFile = useEffectEvent((file: File) => {
    onIncomingFileHandled?.();
    void savePdf(file);
  });
  useEffect(() => {
    if (!incomingFile) return;
    const frame = requestAnimationFrame(() => handleIncomingFile(incomingFile));
    return () => cancelAnimationFrame(frame);
  }, [incomingFile]);

  const resumeFirstAnalysis = useEffectEvent((material: CourseMaterial) => { void analyzePdf(material); });
  useEffect(() => {
    if (!embedded || concepts.length || phase.status !== "idle") return;
    const pending = courseMaterials.find((item) => item.storage === "local" && item.processingStatus !== "failed");
    if (!pending || resumedMaterialId.current === pending.id) return;
    resumedMaterialId.current = pending.id;
    resumeFirstAnalysis(pending);
  }, [embedded, concepts.length, phase.status, courseMaterials]);

  if (!state.onboardingCompleted || !course) {
    const gate = (
      <FirstRunGate
        kicker="Course material"
        title="Add a course PDF first."
        body="Choose a syllabus, lecture, or notes PDF to give Kelus the topics you want to revise. Then set your exam and confirm the proposed topics."
        preview="materials"
      />
    );
    return embedded ? gate : <AppShell>{gate}</AppShell>;
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
      trackEvent({ name: "concept_review_updated", action: next.has(id) ? "selected" : "removed" });
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
      // Continue the booklet: diagnosis is next — do not park on a ready interstitial.
      router.replace("/today");
    } catch (caught) {
      dispatch({
        type: "CONFIRM_FAILED",
        message: caught instanceof Error ? caught.message : "Kelus could not build the map. Check concept names and try again.",
      });
    }
  }

  const shelf = (
      <>
      {embedded ? null : (
      <header className={`materials-head${readySummary ? " is-complete" : ""}`}>
        <div><p className="kicker">{course.name}</p><h1>Course material</h1></div>
        <p>
          {readySummary
            ? "Your topics are on the map. Continue below, or add another source from the shelf when you need it."
            : "Add the lessons you want to revise for this exam. PDFs supply proposed revision topics; links are bookmarks only."}
        </p>
      </header>
      )}

      {showUpgrade ? <SoftUpgradePrompt moment="third_material" /> : null}

      {embedded && showIngestForm(phase) ? (
        <details
          className="material-add-page"
          open={busy || Boolean(hardError) || sourceFirst || undefined}
        >
          <summary>Add a PDF or notes</summary>
          <section className="material-ingest is-embedded" aria-labelledby="add-material-title">
            <div className="material-ingest-title">
              <h2 id="add-material-title" className="sr-only">Add your course source</h2>
              <p className="material-ingest-lede">Kelus reads the pages, suggests topics, and waits for your confirmation before changing your route.</p>
            </div>
            <div className="material-role-field">
              <label htmlFor="material-role">This source is</label>
              <select id="material-role" value={role} onChange={(event) => setRole(event.target.value as MaterialRole)} disabled={busy}>
                {MATERIAL_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <label
              className={`material-drop${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""} is-quiet`}
              aria-busy={busy || undefined}
              onDragEnter={() => dispatch({ type: "DRAG_ENTER" })}
              onDragLeave={() => dispatch({ type: "DRAG_LEAVE" })}
              onDragOver={(event) => event.preventDefault()}
              onDrop={drop}
            >
              <input ref={fileRef} type="file" accept={SOURCE_FILE_ACCEPT} onChange={(event) => void savePdf(event.target.files?.[0])} disabled={busy} />
              <strong>{busy ? (statusMessage ?? "Working on your PDF…") : "Choose a PDF or notes"}</strong>
              <span>{busy && statusMessage ? statusMessage : "or drop one here · text-based PDFs work fastest"}</span>
            </label>
            <p className="material-ingest-hint">Digital PDFs with selectable text work best. Kelus reads the page text, and you review every proposed topic before it changes your route.</p>
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
            <p className="material-link-hint">Bookmarks stay on your shelf for quick open. Upload a PDF when you want Kelus to propose topics.</p>
            </details>
            {errorKind === "ocr" ? (
              <div className="material-error-rescue" role="group" aria-label="Ways to continue after OCR">
                <p>Kelus needs selectable page text for a reliable topic map. Export a digital PDF from your notes app and try again.</p>
                <div className="material-error-actions">
                  <a className="text-btn" href="#source-shelf-title">Retry with another file</a>
                </div>
              </div>
            ) : null}
            {errorKind === "generic" ? (
              <div className="material-error-actions">
                <a className="text-btn" href="#source-shelf-title">Choose another file</a>
              </div>
            ) : null}
          </section>
        </details>
      ) : null}

      {!embedded ? (
      <section className="material-ingest" aria-labelledby="add-material-title" hidden={!showIngestForm(phase)}>
        <div className="material-ingest-title">
          <p className="kicker">Add material</p>
          <h2 id="add-material-title">Bring the course into one place.</h2>
        </div>
        <div className="material-role-field">
            <label htmlFor="material-role">This source is</label>
            <select id="material-role" value={role} onChange={(event) => setRole(event.target.value as MaterialRole)} disabled={busy}>
              {MATERIAL_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <p>
              Digital PDFs with selectable text work fastest. You review every suggested topic before it changes your revision route.
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
          <input ref={fileRef} type="file" accept={SOURCE_FILE_ACCEPT} onChange={(event) => void savePdf(event.target.files?.[0])} disabled={busy} />
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
            <p>Kelus needs selectable page text for a reliable topic map. Export a digital PDF from your notes app and try again.</p>
            <div className="material-error-actions">
              <a className="text-btn" href="#source-shelf-title">Retry with another file</a>
            </div>
          </div>
        ) : null}
        {errorKind === "generic" ? (
          <div className="material-error-actions">
            <a className="text-btn" href="#source-shelf-title">Choose another file</a>
          </div>
        ) : null}
      </section>
      ) : null}

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
            <h2 id="material-ready-title" tabIndex={-1} ref={focusPhaseHeading}>
              {readySummary.conceptCount} confirmed concept{readySummary.conceptCount === 1 ? "" : "s"} from your file.
            </h2>
            <p>
              Your topics are saved. Next, check what you remember so Kelus can suggest where to begin. You can inspect the map whenever you need it.</p>
            <div className="material-ready-actions">
              <Link className="cta" href="/today">Continue: short check, then study <span aria-hidden="true">→</span></Link>
              <div className="material-ready-secondary">
                <Link href="/today?section=map">Review the index</Link>
                <button type="button" onClick={() => dispatch({ type: "ADD_ANOTHER" })}>Add another source</button>
              </div>
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
              <div><p className="kicker">Review your topics</p><h2 id="concept-confirmation-title" tabIndex={-1} ref={focusPhaseHeading}>Kelus found {analysis.proposals.length} proposed concepts.</h2>{analysis.coverage ? <ReadCoverage coverage={analysis.coverage} found={analysis.proposals.length} /> : null}</div>
              <p>
                Keep only the concepts this exam actually covers. Each one retains the page where Kelus found it.
                {state.diagnosisCompleted
                  ? " Confirming a new set replaces your current map and asks you to redo the short familiarity check."
                  : null}
              </p>
            </header>
            <p className="concept-review-selection" role="status" aria-live="polite">
              {selectedIds.size} selected · Select a topic to inspect the exact text Kelus used.
            </p>
            <div className="material-review-workspace">
            <aside className="material-source-preview" aria-label="Original course PDF">
              <div className="material-source-preview-head">
                <div><span>Your source</span><strong>{analysis.material.fileName ?? analysis.material.title}</strong></div>
                {previewUrl ? <a href={`${previewUrl}#page=${previewPage}`} target="_blank" rel="noreferrer">Open PDF ↗</a> : null}
              </div>
              <div className="material-source-page" aria-label={`Extracted text from ${analysis.material.kind === "text" ? "section" : "page"} ${previewPage}`}>
                <span>{analysis.material.kind === "text" ? "Section" : "Page"} {previewPage} · text Kelus read</span>
                <p>{analysis.pages.find((page) => page.pageNumber === previewPage)?.text.slice(0, 2200) || (analysis.material.kind === "text" ? "This section is empty." : "No readable text on this page. Open the original PDF to inspect it.")}</p>
              </div>
              <p>{analysis.material.kind === "text" ? "Select a topic to check its source section." : "Select a topic to check its source page. Open PDF shows the original layout."}</p>
            </aside>
            <ol className="concept-proposal-list">
              {analysis.proposals.map((proposal, index) => (
                <li key={proposal.id} className={selectedIds.has(proposal.id) ? "is-selected" : undefined} onFocusCapture={() => setPreviewPage(Number(proposal.locator.match(/\d+/)?.[0] ?? 1))} onMouseEnter={() => setPreviewPage(Number(proposal.locator.match(/\d+/)?.[0] ?? 1))}>
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
                      <small className={`proposal-confidence is-${proposalConfidence(proposal)}`}>
                        {proposalConfidence(proposal) === "high"
                          ? "High confidence · grounded in page text"
                          : "Review carefully · inferred from limited source text"}
                      </small>
                      <span className="proposal-source-excerpt">“{proposal.sourceExcerpt.slice(0, 260)}{proposal.sourceExcerpt.length > 260 ? "…" : ""}”</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            </div>
            <div className="concept-confirmation-actions">
              <button type="button" className="cta" disabled={!selectedIds.size} onClick={buildMap}>Confirm topics <span aria-hidden="true">→</span></button>
              <div className="concept-confirmation-secondary">
                <button type="button" onClick={() => dispatch({ type: "REVIEW_LATER" })}>Review later</button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className={`material-shelf${embedded ? " is-binder" : ""}`} aria-labelledby="source-shelf-title">
        <header>
          <div>
            <p className="kicker">{embedded ? "In this binder" : "Source shelf"}</p>
            <h2 id="source-shelf-title">
              {courseMaterials.length
                ? `${courseMaterials.length} ${embedded ? (courseMaterials.length === 1 ? "source" : "sources") : "saved"}`
                : concepts.length
                  ? "Sample model ready"
                  : embedded
                    ? "Empty binder"
                    : "Nothing saved yet"}
            </h2>
          </div>
          <span>{embedded ? "This exam" : "This device"}</span>
        </header>
        {courseMaterials.length ? (
          <ul>{courseMaterials.map((item) => <MaterialRow key={item.id} item={item} userId={auth.user?.id} syncState={syncStates[item.id]} quiet={embedded} onAnalyze={(material) => void analyzePdf(material)} onRemoved={(material) => removeMaterialSource(material.id)} linkedTopics={state.snapshot.learningActivities.filter((activity) => activity.sourceReferences.some((reference) => reference.materialId === item.id)).length} topicNames={[...new Set(state.snapshot.learningActivities.filter((activity) => activity.sourceReferences.some((reference) => reference.materialId === item.id)).map((activity) => state.snapshot.concepts.find((concept) => concept.id === activity.conceptId)?.name).filter((name): name is string => Boolean(name)))]} />)}</ul>
        ) : concepts.length ? (
          <div className="material-shelf-empty">
            <p>Sample model is ready. Add your own syllabus when you want Kelus grounded in your files.</p>
            <Link className="cta" href="/today">
              Continue to Today <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div className="material-shelf-empty">
            <p>{embedded ? "Add the syllabus or lecture for this exam. Kelus proposes topics you confirm." : "No sources on this shelf yet. Add the syllabus or lecture you’re studying — Kelus will propose topics you confirm."}</p>
            <div className="materials-empty-actions">
              <a className="cta" href="#add-material-title">
                Add first PDF <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        )}
      </section>

      {embedded ? (
        <p className="material-binder-note">Only confirmed topics change your route. Pages stay with this exam.</p>
      ) : (
        <aside className="material-honesty">
          <p className="kicker">Private and reviewable</p>
          <p>{auth.user ? "Signed-in materials are stored in your private Kelus account and cached on this device. " : "Materials stay on this device until you sign in. "}Kelus uses only the concepts you confirm, and every learning activity keeps its source page visible.</p>
        </aside>
      )}
      </>
  );
  return embedded ? <div className={`material-binder-stack${sourceFirst ? " is-source-first" : ""}`}>{shelf}</div> : <AppShell>{shelf}</AppShell>;
}
