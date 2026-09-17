"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { kelusDuration, kelusEase } from "@/components/motion";
import { useCallback, useState } from "react";
import { ConceptInspector } from "@/components/ConceptInspector";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { generateRoute } from "@/domain/routing-engine";
import { courseMastery } from "@/domain/scheduler";

/** Topic map body for the shared revision surface (no page chrome). */
export function TopicMapPanel() {
  const { state } = useLearner();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const closeInspector = useCallback(() => setSelectedId(null), []);
  const reduceMotion = useReducedMotion();
  const course = state.snapshot.courses[0];
  if (!course) return <p>No active course.</p>;

  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  const exam = state.snapshot.exams.find((item) => item.courseId === course.id && item.isActive);
  const startConceptId = exam
    ? generateRoute({
        concepts,
        relationships: state.snapshot.relationships,
        events: state.snapshot.events,
        exam,
        nowIso: state.nowIso,
      }).allocations.find((item) => item.conceptId !== "mixed-retrieval")?.conceptId ?? null
    : null;
  const selected = concepts.find((concept) => concept.id === selectedId) ?? null;
  const filtered = concepts.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="surface-map is-luxury">
      <div className="map-tools">
        <label htmlFor="topic-filter">
          <span className="sr-only">Find a topic</span>
          <input
            id="topic-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a topic"
          />
        </label>
        <span role="status">
          {filtered.length}/{concepts.length}
        </span>
      </div>
      <div className={`map-workspace${selected ? " is-inspecting" : ""}`}>
        <div>
          <KnowledgeMap
            heading={null}
            courseName={course.name}
            mastery={courseMastery(concepts)}
            concepts={filtered}
            relationships={state.snapshot.relationships}
            selectedId={selectedId}
            startConceptId={startConceptId}
            onSelect={(concept) => setSelectedId(concept.id)}
          />
          {query.trim() && !filtered.length ? (
            <div className="map-no-match">
              <p>No topics match “{query}”. Your course is unchanged.</p>
              <button type="button" className="text-btn" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          ) : null}
        </div>
        <AnimatePresence initial={false} mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              className="concept-inspector-wrap"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
              transition={{ duration: reduceMotion ? kelusDuration.micro : kelusDuration.moderate, ease: kelusEase }}
            >
              <ConceptInspector
                concept={selected}
                concepts={concepts}
                relationships={state.snapshot.relationships}
                events={state.snapshot.events}
                nowIso={state.nowIso}
                onClose={closeInspector}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
