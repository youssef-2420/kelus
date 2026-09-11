"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptInspector } from "@/components/ConceptInspector";
import { FirstRunGate } from "@/components/FirstRunGate";
import { MapPreviewIllustration } from "@/components/how/HowIllustrations";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { courseMastery } from "@/domain/scheduler";
import { DirectionalPage } from "@/components/PageTransition";

const MAP_PREVIEW_TOPICS = ["Supply & Demand", "Elasticity", "Fiscal Policy"] as const;

export default function MapPage() {
  const { state, useDemo: loadDemo } = useLearner();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const closeInspector = useCallback(() => setSelectedId(null), []);
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
  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  const selected = concepts.find((concept) => concept.id === selectedId) ?? null;
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
    <AppShell action={!state.diagnosisCompleted ? <Link className="text-btn" href="/today">Continue to diagnosis <span aria-hidden="true">→</span></Link> : undefined}>
      <p className="kicker">Topic map</p>
      <h1 className="today-title">{state.diagnosisCompleted ? "What matters versus what you know" : "Your course topics, mapped"}</h1>
      <p className="lede-line">{state.diagnosisCompleted ? "Sorted by exam importance, with links when topics depend on each other." : "These are the topics you confirmed. Diagnosis will add the first evidence about what you know."}</p>
      <div className="map-tools">
        <label htmlFor="topic-filter">Find a topic<input id="topic-filter" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your course topics" /></label>
        <span role="status">{concepts.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).length} of {concepts.length} topics</span>
      </div>
      <div className={`map-workspace${selected ? " is-inspecting" : ""}`}>
        <div>
        <KnowledgeMap
          heading={null}
          courseName={course.name}
          mastery={courseMastery(concepts)}
          concepts={concepts.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))}
          relationships={state.snapshot.relationships}
          selectedId={selectedId}
          onSelect={(concept) => setSelectedId(concept.id)}
        />
        {query.trim() && !concepts.some((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())) ? <div className="map-no-match"><p>No topics match “{query}”. Your course is unchanged.</p><button type="button" className="text-btn" onClick={() => setQuery("")}>Clear search</button></div> : null}
        </div>
        <AnimatePresence initial={false} mode="wait">
          {selected ? (
            <motion.div key={selected.id} className="concept-inspector-wrap" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }} transition={{ duration: reduceMotion ? kelusDuration.micro : kelusDuration.moderate, ease: kelusEase }}>
              <ConceptInspector concept={selected} concepts={concepts} relationships={state.snapshot.relationships} events={state.snapshot.events} nowIso={state.nowIso} onClose={closeInspector} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AppShell>
  </DirectionalPage>
  );
}
