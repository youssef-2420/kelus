"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FirstRunGate } from "@/components/FirstRunGate";
import { MapPreviewIllustration } from "@/components/how/HowIllustrations";
import { TopicMapPanel } from "@/components/TopicMapPanel";
import { useLearner } from "@/components/LearnerProvider";
import { DirectionalPage } from "@/components/PageTransition";

const MAP_PREVIEW_TOPICS = ["Supply & Demand", "Elasticity", "Fiscal Policy"] as const;

export default function MapPage() {
  const router = useRouter();
  const { state, useDemo: loadDemo } = useLearner();
  const reduceMotion = useReducedMotion();
  const course = state.snapshot.courses[0];
  const concepts = course ? state.snapshot.concepts.filter((concept) => concept.courseId === course.id) : [];
  const studyReady = state.onboardingCompleted && state.diagnosisCompleted && concepts.length > 0;

  useEffect(() => {
    if (studyReady) router.replace("/today?section=map");
  }, [studyReady, router]);

  if (studyReady) {
    return (
      <DirectionalPage>
        <main id="main" className="destination-page">
          <p className="destination-brand">Kelus</p>
          <h1 className="destination-page-title">Opening Map…</h1>
        </main>
      </DirectionalPage>
    );
  }

  if (!state.onboardingCompleted) {
    return (
      <DirectionalPage>
        <AppShell>
          <FirstRunGate
            kicker="Topic map"
            title="Set my exam first."
            body="The map is where confirmed topics live — importance, what you know, and links when sources show prerequisites. Materials holds the PDFs; this page holds the graph."
            preview="map"
          />
        </AppShell>
      </DirectionalPage>
    );
  }

  if (!course) return <AppShell><p>No active course.</p></AppShell>;

  if (!concepts.length) {
    return (
      <DirectionalPage>
        <AppShell>
          <section className="materials-empty is-first-run-gate">
            <div className="first-run-gate-copy">
              <p className="kicker">Topic map</p>
              <h1>Confirm topics from a source first.</h1>
              <p>Materials holds the PDFs. Here you’ll see the graph — exam importance, what you know, and links when pages show prerequisites.</p>
              <div className="materials-empty-actions">
                <Link className="cta" href="/materials">
                  Add course material <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="first-run-gate-aside">
                Just looking?{" "}
                <button type="button" className="text-btn inline" onClick={() => loadDemo()}>
                  Try sample (~1 min)
                </button>
              </p>
            </div>
            <div className="first-run-gate-preview">
              <p className="first-run-gate-preview-label">What the topic map looks like</p>
              <MapPreviewIllustration reduceMotion={reduceMotion === true} concepts={MAP_PREVIEW_TOPICS} />
            </div>
          </section>
        </AppShell>
      </DirectionalPage>
    );
  }

  return (
    <DirectionalPage>
      <AppShell action={<Link className="text-btn" href="/today">Continue to diagnosis <span aria-hidden="true">→</span></Link>}>
        <TopicMapPanel />
      </AppShell>
    </DirectionalPage>
  );
}
