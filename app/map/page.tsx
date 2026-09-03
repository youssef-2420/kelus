"use client";

import { AppShell } from "@/components/AppShell";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { courseMastery } from "@/domain/scheduler";

export default function MapPage() {
  const { state } = useLearner();
  const course = state.snapshot.courses[0];
  if (!course) return <AppShell><p>No active course.</p></AppShell>;
  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.mastery - a.mastery || a.name.localeCompare(b.name));
  return (
    <AppShell>
      <p className="kicker quiet">Mastery and status</p>
      <h1 style={{ fontSize: "clamp(32px, 6vw, 46px)", margin: "8px 0 8px" }}>Knowledge map</h1>
      <p className="quiet" style={{ marginBottom: 8 }}>What is strong, fading, or still weak — not a graph.</p>
      <KnowledgeMap heading={null} courseName={course.name} mastery={courseMastery(concepts)} concepts={concepts} />
    </AppShell>
  );
}
