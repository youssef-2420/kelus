"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { InitialDiagnosis } from "@/components/InitialDiagnosis";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { RevisionSurface } from "@/components/RevisionSurface";
import { useLearner } from "@/components/LearnerProvider";
import { trackEvent } from "@/lib/analytics";
import { LateralPage, SuspenseFallbackExit, SuspenseReveal } from "@/components/PageTransition";
import styles from "./loading.module.css";

function TodayBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, completeSetup, completeDiagnosis, useDemo: loadDemo } = useLearner();
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
        <p>Opening a finished course model so you can see Today in about a minute.</p>
      </main>
    );
  }

  if (!state.onboardingCompleted) {
    return (
      <FirstRunSetup
        onComplete={(input) => {
          try { window.localStorage.setItem("kelus-first-route-started-at", String(Date.now())); } catch { /* Timing analytics are optional. */ }
          completeSetup(input);
          router.push("/materials");
        }}
        onUseDemo={loadDemo}
      />
    );
  }

  if (!state.snapshot.concepts.length) {
    return (
      <AppShell>
        <div className="workbench-chapter" data-chapter="materials">
          <p className="workbench-chapter-label">Chapter 2 · Materials</p>
          <section className="materials-empty workbench-chapter-intro">
            <p className="kicker">Materials</p>
            <h1>Bring in one real source.</h1>
            <p>Add a syllabus or lecture PDF, then confirm the concepts Kelus should route through.</p>
            <div className="materials-empty-actions">
              <button type="button" className="cta" onClick={() => loadDemo()}>
                Try sample (~1 min) <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
          <MaterialLibrary embedded />
        </div>
      </AppShell>
    );
  }

  if (!state.diagnosisCompleted) {
    return (
      <AppShell>
        <div className="workbench-chapter" data-chapter="check">
          <p className="workbench-chapter-label">Chapter 3 · Quick check</p>
          <InitialDiagnosis snapshot={state.snapshot} onComplete={finishDiagnosis} embedded />
        </div>
      </AppShell>
    );
  }

  return <RevisionSurface />;
}


export default function TodayPage() {
  return (
    <LateralPage>
      <Suspense
        fallback={
          <SuspenseFallbackExit>
            <main id="main" className="destination-page">
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
