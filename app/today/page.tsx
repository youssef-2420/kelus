"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CourseStudioOnboarding } from "@/components/CourseStudioOnboarding";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { EmptyCourse } from "@/components/EmptyCourse";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { RevisionSurface } from "@/components/RevisionSurface";
import { useLearner } from "@/components/LearnerProvider";
import { trackEvent } from "@/lib/analytics";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";
import styles from "./loading.module.css";
import { addSourceMaterial, getMaterialsSnapshot, getServerMaterialsSnapshot, subscribeMaterials } from "@/lib/material-store";
import { CURRENT_COURSE_ID } from "@/lib/setup";
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
  const { state, completeSetup, completeDiagnosis, useDemo: loadDemo } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const notesSource = materials.find((item) => item.storage === "local")?.kind === "text";
  const sampleHandled = useRef(false);
  const [setupStage, setSetupStage] = useState<"upload" | "exam">("upload");
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
    return (
      <CourseStudioOnboarding stage={setupStage}>
        <FirstRunSetup
          onStageChange={setSetupStage}
          onComplete={async (input, file) => {
            try { window.localStorage.setItem("kelus-first-route-started-at", String(Date.now())); } catch { /* Timing analytics are optional. */ }
            const role = /syllabus|outline/i.test(file.name) ? "syllabus" : /slides|lecture/i.test(file.name) ? "lecture_slides" : "notes";
            await addSourceMaterial({ courseId: CURRENT_COURSE_ID, file, role });
            completeSetup(input);
          }}
        />
      </CourseStudioOnboarding>
    );
  }

  if (!state.snapshot.concepts.length) {
    const course = state.snapshot.courses[0];
    const hasSource = materials.some((item) => item.storage === "local");
    return (
      <CourseStudioOnboarding stage="confirm" courseName={course?.name}>
        {hasSource ? (
          <div className="workbench-chapter" data-chapter="materials">
            <p className="workbench-chapter-label">Confirm your topics</p>
            <section className="materials-empty workbench-chapter-intro">
              <p className="kicker">{notesSource ? "From your notes" : "From your PDF"}</p>
              <h1>{notesSource ? "Check the topics from your notes." : "Check the topics from your PDF."}</h1>
              <p>{notesSource ? "Kelus reads the sections under each heading. Keep only the topics you actually need to revise." : "Kelus reads the pages you chose. Keep only the topics you actually need to revise."}</p>
            </section>
            <MaterialLibrary embedded />
          </div>
        ) : (
          // One screen, one job: no topics and no source means the only thing to do is add notes.
          <EmptyCourse courseId={course?.id ?? CURRENT_COURSE_ID} courseName={course?.name} />
        )}
      </CourseStudioOnboarding>
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
