"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { AppShell } from "@/components/AppShell";
import { FirstRunGate } from "@/components/FirstRunGate";
import { MapPreviewIllustration } from "@/components/how/HowIllustrations";
import { RevisionSurface } from "@/components/RevisionSurface";
import { TopicMapPanel } from "@/components/TopicMapPanel";
import { useLearner } from "@/components/LearnerProvider";
import { DirectionalPage } from "@/components/PageTransition";

const MAP_PREVIEW_TOPICS = ["Supply & Demand", "Elasticity", "Fiscal Policy"] as const;

export default function MapPage() {
  const { state, useDemo: loadDemo } = useLearner();
  const reduceMotion = useReducedMotion();

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

  const course = state.snapshot.courses[0];
  if (!course) return <AppShell><p>No active course.</p></AppShell>;

  const concepts = state.snapshot.concepts.filter((concept) => concept.courseId === course.id);
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

  if (state.diagnosisCompleted) {
    return (
      <DirectionalPage>
        <RevisionSurface mode="map" />
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
