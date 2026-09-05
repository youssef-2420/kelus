"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { useLearner } from "@/components/LearnerProvider";
import { courseMastery } from "@/domain/scheduler";

export default function MapPage() {
  const { state } = useLearner();
  if (!state.onboardingCompleted) {
    return <AppShell><p className="kicker">Set up required</p><h1 className="today-title">Build your first route first.</h1><Link href="/today" className="cta">Set up your exam</Link></AppShell>;
  }
  const course = state.snapshot.courses[0];
  if (!course) return <AppShell><p>No active course.</p></AppShell>;
  const concepts = state.snapshot.concepts
    .filter((concept) => concept.courseId === course.id)
    .slice()
    .sort((a, b) => b.examImportance - a.examImportance || a.mastery - b.mastery);
  return (
    <AppShell>
      <p className="kicker">Course</p>
      <h1 className="today-title">What matters versus what you know</h1>
      <p className="lede-line">Sorted by exam importance, not by weakness.</p>
      <KnowledgeMap heading={null} courseName={course.name} mastery={courseMastery(concepts)} concepts={concepts} />
    </AppShell>
  );
}
