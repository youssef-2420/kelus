"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DropNotes } from "@/components/DropNotes";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { RevisionSurface } from "@/components/RevisionSurface";
import { useLearner } from "@/components/LearnerProvider";
import { trackEvent } from "@/lib/analytics";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";
import styles from "./loading.module.css";
import { addSourceMaterial, getMaterialsSnapshot, getServerMaterialsSnapshot, removeMaterial, subscribeMaterials } from "@/lib/material-store";
import { removeRemoteMaterial } from "@/lib/material-sync";
import { useAuth } from "@/components/AuthProvider";
import { materialTitle } from "@/domain/materials";
import { CURRENT_COURSE_ID, type SetupInput } from "@/lib/setup";

const SAMPLE_COURSE_ID = "course-microeconomics";
import type { LearnerSnapshot } from "@/domain/types";

function BuildingPlan({ snapshot, onReady }: { snapshot: LearnerSnapshot; onReady: (input: Parameters<ReturnType<typeof useLearner>["completeDiagnosis"]>[0]) => void }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const top = [...snapshot.concepts].sort((a, b) => b.examImportance - a.examImportance || a.name.localeCompare(b.name)).slice(0, 3);
    onReady({ ratings: Object.fromEntries(top.map((concept) => [concept.id, "dont_know" as const])), retrievals: [] });
    // Runs once when the topics are confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <main id="main" className="destination-page">
      <h1 className="destination-page-title" role="status">Building your plan…</h1>
    </main>
  );
}

function TodayBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, completeSetup, completeDiagnosis, removeMaterialSource, useDemo: loadDemo } = useLearner();
  const auth = useAuth();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const notesSource = materials.find((item) => item.storage === "local")?.kind === "text";
  const sampleHandled = useRef(false);
  const wantsSample = searchParams.get("sample") === "1";
  const sampleBooting = wantsSample && !state.onboardingCompleted;

  useEffect(() => {
    if (!wantsSample) return;
    if (sampleHandled.current) return;
    sampleHandled.current = true;
    const alreadyReady = state.onboardingCompleted && state.snapshot.concepts.length > 0;
    if (!alreadyReady) {
      loadDemo();
      trackEvent({ name: "sample_loaded", source: "today_query" });
    }
    router.replace("/today");
  }, [wantsSample, state.onboardingCompleted, state.snapshot.concepts.length, loadDemo, router]);

  function finishDiagnosis(input: Parameters<typeof completeDiagnosis>[0]) {
    completeDiagnosis(input);
    try {
      sessionStorage.setItem("kelus-focus-today-start", "1");
    } catch {
      /* Focus handoff is optional. */
    }
    let elapsedMs = 0;
    try {
      const startedAt = Number(window.localStorage.getItem("kelus-first-route-started-at"));
      elapsedMs = startedAt > 0 ? Math.max(0, Date.now() - startedAt) : 0;
      window.localStorage.removeItem("kelus-first-route-started-at");
    } catch {
      elapsedMs = 0;
    }
    trackEvent({ name: "first_route_ready", elapsed_ms: elapsedMs, concept_count: state.snapshot.concepts.length });
  }

  const roleFor = (file: File) => (/syllabus|outline/i.test(file.name) ? "syllabus" : /slides|lecture/i.test(file.name) ? "lecture_slides" : "notes");

  /** The very first notes: make the course with sensible defaults and read the file. The exam date is asked after the first run. */
  async function startFromFile(file: File) {
    try { window.localStorage.setItem("kelus-first-route-started-at", String(Date.now())); } catch { /* Timing analytics are optional. */ }
    const title = materialTitle("", file.name);
    const examDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const input: SetupInput = {
      courseName: !title || /^pasted notes$/i.test(title) ? "My course" : title,
      examName: "Your exam",
      examDate,
      targetPercent: 85,
      availableMinutes: 30,
      examDatePlaceholder: true,
    };
    await addSourceMaterial({ courseId: CURRENT_COURSE_ID, file, role: roleFor(file) });
    try { sessionStorage.setItem("kelus-start-first-run", "1"); } catch { /* Without it the learner lands on Today instead. */ }
    completeSetup(input);
  }

  async function addNotes(file: File, courseId: string) {
    await addSourceMaterial({ courseId, file, role: roleFor(file) });
    try { sessionStorage.setItem("kelus-start-first-run", "1"); } catch { /* Without it the learner lands on Today instead. */ }
  }

  /** A file with nothing readable in it: remove it (and anything half-made) so the start screen comes back clean. */
  async function startOver(materialIds: string[]) {
    for (const id of materialIds) {
      await removeMaterial(id).catch(() => undefined);
      removeMaterialSource(id);
      if (auth.user) await removeRemoteMaterial(auth.user.id, id).catch(() => undefined);
    }
  }

  if (sampleBooting) {
    return (
      <main id="main" className="destination-page">
        <p className="destination-brand">Kelus</p>
        <h1 className="destination-page-title">Loading sample…</h1>
        <p>Opening the course preview.</p>
      </main>
    );
  }

  if (!state.onboardingCompleted) {
    return <DropNotes first onFile={startFromFile} />;
  }

  if (!state.snapshot.concepts.length) {
    const course = state.snapshot.courses[0];
    const local = materials.filter((item) => item.storage === "local");
    if (!local.length) {
      // No topics and no notes: the same single screen as the very first one. A leftover built-in sample is not
      // the learner's course, so it never names the page or receives their notes: they start their own.
      const leftoverSample = course?.id === SAMPLE_COURSE_ID;
      if (leftoverSample) return <DropNotes first onFile={startFromFile} />;
      return <DropNotes courseName={course?.name} onFile={(file) => addNotes(file, course?.id ?? CURRENT_COURSE_ID)} />;
    }
    return (
      <main id="main" className="destination-page start-page">
        <MaterialLibrary embedded quiet onStartOver={() => void startOver(local.map((item) => item.id))} />
      </main>
    );
  }

  if (!state.diagnosisCompleted) {
    // No rating screen: topics start as "new", and your first answers set the route.
    return <BuildingPlan snapshot={state.snapshot} onReady={finishDiagnosis} />;
  }

  return <RevisionSurface />;
}


export default function TodayPage() {
  return (
    <LateralPage>
      <Suspense
        fallback={
          <SuspenseFallbackExit>
            <main id="main" className={`destination-page ${styles.loading}`}>
              <h1 className="destination-page-title" role="status">Opening Today…</h1>
              <div className={styles.lines} aria-hidden="true"><span /><span /><span /></div>
            </main>
          </SuspenseFallbackExit>
        }
      >
        <SuspenseReveal>
          <TodayBody />
        </SuspenseReveal>
      </Suspense>
    </LateralPage>
  );
}
