"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { CourseSourceReader } from "@/components/CourseSourceReader";
import { TodayRoute } from "@/components/TodayRoute";
import { InkArt } from "@/components/InkArt";
import { ExamPulse } from "@/components/ExamPulse";
import { estimatedReadiness } from "@/domain/readiness";
import { TopicMapPanel } from "@/components/TopicMapPanel";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useAuth } from "@/components/AuthProvider";
import { KelusLogoMark } from "@/components/KelusLogoMark";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { generateRoute } from "@/domain/routing-engine";
import { trackEvent } from "@/lib/analytics";
import { getMaterialsSnapshot, getServerMaterialsSnapshot, removeMaterial, subscribeMaterials } from "@/lib/material-store";
import { removeRemoteMaterial } from "@/lib/material-sync";

export type SurfaceMode = "today" | "materials" | "map";

const MODES: Array<{ id: SurfaceMode; label: string }> = [
  { id: "today", label: "Study plan" },
  { id: "materials", label: "Materials" },
  { id: "map", label: "Topics" },
];

const MODE_ORDER: Record<SurfaceMode, number> = { today: 0, materials: 1, map: 2 };

const pressSpring = { type: "spring", bounce: 0, duration: 0.24 } as const;

function modeFromSection(section: string | null): SurfaceMode {
  if (section === "materials" || section === "map") return section;
  return "today";
}

function hrefForMode(mode: SurfaceMode) {
  return mode === "today" ? "/today" : `/today?section=${mode}`;
}

/**
 * Course space as a booklet page.
 * Thin strip for section switching; Today’s topic is the page title.
 */
export function RevisionSurface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion() === true;
  const { state, start, reset, removeMaterialSource } = useLearner();
  const auth = useAuth();
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [incomingSource, setIncomingSource] = useState<File | null>(null);
  const [railHidden, setRailHidden] = useState(false);
  const [confirmSourceId, setConfirmSourceId] = useState<string | null>(null);
  const [removingSourceId, setRemovingSourceId] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const sourcePickerRef = useRef<HTMLInputElement>(null);
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const mode = modeFromSection(searchParams.get("section"));
  const [direction, setDirection] = useState(1);
  const previousMode = useRef(mode);

  useEffect(() => {
    const from = previousMode.current;
    if (from !== mode) {
      setDirection(MODE_ORDER[mode] >= MODE_ORDER[from] ? 1 : -1);
      previousMode.current = mode;
    }
  }, [mode]);

  useEffect(() => {
    document.body.classList.add("is-kelus-space", "is-booklet-page", "is-course-studio");
    return () => document.body.classList.remove("is-kelus-space", "is-booklet-page", "is-course-studio");
  }, []);

  useEffect(() => {
    let shouldFocus = false;
    try {
      shouldFocus = sessionStorage.getItem("kelus-focus-today-start") === "1";
      if (shouldFocus) sessionStorage.removeItem("kelus-focus-today-start");
    } catch {
      shouldFocus = false;
    }
    if (!shouldFocus || mode !== "today") return;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>("button.today-start")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!course || !exam) {
    return (
      <main id="main" className="kelus-space is-empty is-paper">
        <section className="materials-empty">
          <h1>Add your course PDF first.</h1>
          <p>Kelus needs a course and exam date before it can open today’s page.</p>
          <button type="button" className="cta" onClick={() => reset()}>
            Start over
          </button>
        </section>
      </main>
    );
  }

  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({
    concepts,
    relationships: snapshot.relationships,
    events: snapshot.events,
    exam,
    nowIso,
  });
  const days = daysUntilExam(exam, nowIso);
  const isSampleCourse = course.id === "course-microeconomics" && exam.id === "exam-microeconomics-final";
  const courseId = course.id;
  const examId = exam.id;
  const openSession = snapshot.sessions.find((session) => session.courseId === courseId && session.status === "in_progress");
  const modeMeta = MODES.find((item) => item.id === mode)!;
  const courseMaterials = materials.filter((item) => item.courseId === courseId);
  const firstConceptId = route.allocations[0]?.conceptId;
  const firstReference = snapshot.learningActivities.find((item) => item.conceptId === firstConceptId)?.sourceReferences[0];
  const preferredMaterial = courseMaterials.find((item) => item.id === firstReference?.materialId);
  const selectedMaterial = (mode === "today" ? preferredMaterial : courseMaterials.find((item) => item.id === selectedMaterialId))
    ?? courseMaterials.find((item) => item.storage === "local")
    ?? courseMaterials[0]
    ?? null;
  const hasReadableSource = selectedMaterial?.storage === "local" && !selectedMaterial.id.startsWith("material-demo-");
  const referencedPage = Number(firstReference?.locator?.match(/\d+/)?.[0] ?? 1);

  function setMode(next: SurfaceMode) {
    if (next === mode) return;
    router.replace(hrefForMode(next), { scroll: false });
  }

  function begin() {
    const sessionId = start(courseId, examId);
    trackEvent({ name: "session_started" });
    try {
      sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    } catch {
      /* Private mode may block sessionStorage; session still starts. */
    }
    router.push(`/session?id=${sessionId}`);
  }

  function resume() {
    if (!openSession) return;
    trackEvent({ name: "session_resumed" });
    router.push(`/session?id=${openSession.id}`);
  }

  async function deleteSource(materialId: string) {
    setRemovingSourceId(materialId);
    setSourceError(null);
    try {
      await removeMaterial(materialId);
      removeMaterialSource(materialId);
      if (selectedMaterialId === materialId) setSelectedMaterialId(null);
      setConfirmSourceId(null);
      if (auth.user) await removeRemoteMaterial(auth.user.id, materialId).catch(() => undefined);
    } catch {
      setSourceError("This source could not be removed. Try again.");
    } finally {
      setRemovingSourceId(null);
    }
  }

  const panelTransition = reduceMotion
    ? { duration: 0.12, ease: kelusEase }
    : { type: "spring" as const, bounce: 0, duration: 0.4 };

  return (
    <section className={`kelus-space is-studio${railHidden ? " is-rail-hidden" : ""}`} aria-label="Revision workbench">
      {!railHidden ? <aside className="studio-rail" aria-label="Course workspace">
        <Link href="/" className="studio-brand" aria-label="Kelus home">
          <span className="studio-brand-identity"><KelusLogoMark /><strong>kelus</strong></span>
          <span aria-hidden="true">↗</span>
        </Link>
        <button type="button" className="studio-rail-toggle" onClick={() => setRailHidden(true)} aria-label="Hide workspace sidebar">Hide sidebar <span aria-hidden="true">←</span></button>
        <p className="studio-rail-label studio-navigation-label">Your workspace</p>
        <nav className="studio-nav revision-surface-modes" aria-label="Revision sections">
          {MODES.map((item) => {
            const active = item.id === mode;
            return (
              <motion.button
                key={item.id}
                type="button"
                data-mode={item.id}
                className={active ? "is-active" : undefined}
                aria-pressed={active}
                aria-label={item.label}
                onClick={() => setMode(item.id)}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={pressSpring}
              >
                {item.label}
              </motion.button>
            );
          })}
        </nav>
        <div className="core-rail-sources">
          <p className="studio-rail-label">Course sources <span>{courseMaterials.length}</span></p>
          {courseMaterials.length ? courseMaterials.map((material) => {
            const title = material.id.startsWith("material-demo-") ? "Built-in Microeconomics example" : material.title;
            const linkedTopics = snapshot.learningActivities.filter((activity) => activity.sourceReferences.some((reference) => reference.materialId === material.id)).length;
            return <div key={material.id} className="core-source-item">
              <button type="button" className={`core-source-open${selectedMaterial?.id === material.id ? " is-selected" : ""}`} onClick={() => { setSelectedMaterialId(material.id); setMode("materials"); }} title={title}>
                <span aria-hidden="true">{material.id.startsWith("material-demo-") ? "◇" : material.storage === "local" ? "▤" : "↗"}</span><span className="core-source-name">{title}</span>
              </button>
              <button type="button" className="core-source-remove" aria-label={`Remove ${title}`} title={`Remove ${title}`} onClick={() => { setSourceError(null); setConfirmSourceId(material.id); }}>×</button>
              {confirmSourceId === material.id ? <div className="core-source-confirm" role="group" aria-label={`Confirm remove ${title}`}>
                <p>Remove {title}?{linkedTopics ? ` This also removes ${linkedTopics} linked topic${linkedTopics === 1 ? "" : "s"} from your route.` : ""}{courseMaterials.length === 1 && linkedTopics ? " You may need another PDF to continue studying." : ""}</p>
                <button type="button" onClick={() => setConfirmSourceId(null)} disabled={removingSourceId === material.id}>Cancel</button>
                <button type="button" className="is-danger" onClick={() => void deleteSource(material.id)} disabled={removingSourceId === material.id}>{removingSourceId === material.id ? "Removing…" : "Remove"}</button>
              </div> : null}
            </div>;
          }) : <p className="core-rail-empty">Add a PDF to keep it beside your plan.</p>}
          {sourceError ? <p className="core-source-error" role="alert">{sourceError}</p> : null}
          <input
            ref={sourcePickerRef}
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Choose a course PDF"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setIncomingSource(file);
              setMode("materials");
            }}
          />
          <button type="button" className="core-add-source" onClick={() => sourcePickerRef.current?.click()}>＋ Add source</button>
        </div>
        <div className="studio-rail-bottom">
          <Link href="/" className="studio-home-link">← Back to Kelus</Link>
          {auth.user ? (
            <button type="button" className="studio-account-action" onClick={() => auth.signOut()}>Sign out</button>
          ) : auth.configured ? (
            <button type="button" className="studio-account-action" onClick={auth.openDialog}>Sign in to sync</button>
          ) : null}
        <details className="studio-more" open={confirmReset || undefined}>
          <summary>Course options</summary>
          {confirmReset ? (
            <span className="today-reset-confirm" role="group" aria-label="Confirm start over">
              <span>Erase this route?</span>
              <button type="button" className="text-btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="text-btn is-danger"
                onClick={() => {
                  setConfirmReset(false);
                  reset();
                }}
              >
                Start over
              </button>
            </span>
          ) : (
            <button type="button" className="text-btn" onClick={() => setConfirmReset(true)}>Start over</button>
          )}
        </details>
        </div>
      </aside> : null}

      <div className="studio-main">
        <header className="studio-topbar">
          <span className="studio-topbar-leading">{railHidden ? <button type="button" className="studio-rail-reopen" onClick={() => setRailHidden(false)} aria-label="Show workspace sidebar">→ <span>Show sidebar</span></button> : null}<span className="studio-topbar-course" title={course.name}>{course.name}</span></span>
          <span className="studio-topbar-status"><span className="studio-topbar-kind">{isSampleCourse ? "Sample course" : exam.target}</span><span className="studio-topbar-divider" aria-hidden="true">·</span><span>{days} day{days === 1 ? "" : "s"} to exam</span></span>
        </header>
        <main id="main" className="studio-page kelus-space-stage">
        {mode !== "today" ? (
          <header className="studio-section-head kelus-paper-head kelus-space-top is-section">
            <div className="kelus-space-identity">
              <AnimatePresence mode="wait" initial={false}>
                <motion.h1
                  key={modeMeta.label}
                  id="section-title"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                  transition={{ duration: reduceMotion ? 0.1 : kelusDuration.fast, ease: kelusEase }}
                >
                  {modeMeta.label}
                </motion.h1>
              </AnimatePresence>
              <p className="kelus-paper-lede kelus-space-lede">
                {mode === "materials" ? "The sources behind your revision." : "Your topics, ordered by exam value."}
              </p>
              <ExamPulse readiness={estimatedReadiness(concepts)} targetPercent={exam.targetPercent} daysToExam={days} />
            </div>
            <InkArt name={mode === "materials" ? "sources" : "topics"} className="studio-section-art" />
          </header>
        ) : null}

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={mode}
            className="studio-panel kelus-paper-body kelus-space-panel revision-surface-panel"
            custom={direction}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={panelTransition}
          >
            {mode === "today" ? (
              <div className={`core-workspace-grid${hasReadableSource ? "" : " is-source-missing"}`} aria-label="Today's route">
                {hasReadableSource ? <CourseSourceReader key={`${selectedMaterial.id}-${selectedMaterial.id === preferredMaterial?.id ? referencedPage : 1}`} material={selectedMaterial} initialPage={selectedMaterial.id === preferredMaterial?.id ? referencedPage : 1} /> : null}
                <div className="core-workspace-action workbench-focus is-ready is-one-next is-booklet-page" aria-labelledby="today-title">
                  {!hasReadableSource ? <p className="core-source-inline">This plan has no original PDF beside it. <Link href="/today?section=materials">Add your course PDF</Link> to study from your own pages.</p> : null}
                  <TodayRoute
                    route={route}
                    concepts={concepts}
                    activities={snapshot.learningActivities}
                    events={snapshot.events}
                    examTarget={exam.target}
                    targetPercent={exam.targetPercent}
                    daysToExam={days}
                    isSampleCourse={isSampleCourse}
                    onStart={openSession ? resume : begin}
                    startLabel={openSession ? "Resume session" : undefined}
                  />
                </div>
              </div>
            ) : null}
            {mode === "materials" ? <div className={`core-workspace-grid is-materials${hasReadableSource ? "" : " is-source-missing"}`}>{hasReadableSource ? <CourseSourceReader key={selectedMaterial.id} material={selectedMaterial} /> : null}<div className="core-workspace-action"><MaterialLibrary embedded incomingFile={incomingSource} onIncomingFileHandled={() => setIncomingSource(null)} /></div></div> : null}
            {mode === "map" ? <TopicMapPanel /> : null}
          </motion.div>
        </AnimatePresence>
        </main>
      </div>
    </section>
  );
}
