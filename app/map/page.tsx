"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptInspector } from "@/components/ConceptInspector";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { courseMastery } from "@/domain/scheduler";

export default function MapPage() {
  const { state, useDemo: loadDemo } = useLearner();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  if (!state.onboardingCompleted) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Knowledge Map</p>
          <h1>Set your exam first.</h1>
          <p>Kelus needs a course and exam before it can show a map.</p>
          <Link href="/today" className="cta">Set your exam <span aria-hidden="true">→</span></Link>
        </section>
      </AppShell>
    );
  }
  const course = state.snapshot.courses[0];
  if (!course) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Knowledge Map</p>
          <h1>No active course.</h1>
          <p>Set your exam so Kelus can show a map of what this course covers.</p>
          <Link href="/today" className="cta">Set your exam <span aria-hidden="true">→</span></Link>
        </section>
      </AppShell>
    );
  }
  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  const selected = concepts.find((concept) => concept.id === selectedId) ?? null;
  if (!concepts.length) {
    return (
      <AppShell>
        <section className="materials-empty">
          <p className="kicker">Knowledge Map</p>
          <h1>Confirm concepts from a source first.</h1>
          <p>Add a syllabus or lecture PDF, then keep the concepts this exam actually covers.</p>
          <div className="materials-empty-actions">
            <button type="button" className="cta" onClick={() => loadDemo()}>
              Try sample (~1 min) <span aria-hidden="true">→</span>
            </button>
            <Link className="text-btn" href="/materials">Add course material <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </AppShell>
    );
  }
  return (
    <AppShell action={!state.diagnosisCompleted ? <Link className="text-btn" href="/today">Continue to diagnosis <span aria-hidden="true">→</span></Link> : undefined}>
      <p className="kicker">Course</p>
      <h1 className="today-title">{state.diagnosisCompleted ? "What matters versus what you know" : "Your course is now a Knowledge Map"}</h1>
      <p className="lede-line">{state.diagnosisCompleted ? "Sorted by exam importance, not by weakness." : "These are the concepts you confirmed. Diagnosis will add the first evidence about what you know."}</p>
      <div className={`map-workspace${selected ? " is-inspecting" : ""}`}>
        <KnowledgeMap heading={null} courseName={course.name} mastery={courseMastery(concepts)} concepts={concepts} selectedId={selectedId} onSelect={(concept) => setSelectedId(concept.id)} />
        <AnimatePresence initial={false} mode="wait">
          {selected ? (
            <motion.div key={selected.id} className="concept-inspector-wrap" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }} transition={{ type: "spring", bounce: 0, duration: reduceMotion ? 0.1 : 0.28 }}>
              <ConceptInspector concept={selected} concepts={concepts} relationships={state.snapshot.relationships} events={state.snapshot.events} nowIso={state.nowIso} onClose={() => setSelectedId(null)} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
