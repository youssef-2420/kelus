"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { estimatedReadiness } from "@/domain/readiness";
import { percent } from "@/lib/format";
import {
  getMaterialsSnapshot,
  getServerMaterialsSnapshot,
  subscribeMaterials,
} from "@/lib/material-store";

/**
 * Quiet course continuity across the one workbench — identity, chapter, and
 * where you are — not a second nav or a SaaS “learning loop” sidebar.
 */
export function CourseWorkspaceRail() {
  const { state } = useLearner();
  const pathname = usePathname();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const course = state.snapshot.courses[0];
  const exam = state.snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!state.onboardingCompleted || !course || !exam) return null;

  const concepts = state.snapshot.concepts.filter((item) => item.courseId === course.id);
  const sourceCount = materials.filter((item) => item.courseId === course.id).length;
  const materialsReady = sourceCount > 0 || concepts.length > 0;
  const readiness = estimatedReadiness(concepts);
  const days = daysUntilExam(exam, state.nowIso);
  const studyReady = state.diagnosisCompleted && concepts.length > 0;

  const phase = !materialsReady
    ? { label: "Add materials", href: "/materials" as const }
    : !concepts.length
      ? { label: "Confirm topics", href: "/materials" as const }
      : !state.diagnosisCompleted
        ? { label: "Quick check", href: "/today" as const }
        : { label: "Today’s route", href: "/today" as const };

  const chapters: Array<{
    id: string;
    label: string;
    href: "/today" | "/materials";
    done: boolean;
    current: boolean;
  }> = [
    {
      id: "exam",
      label: "Exam",
      href: "/today",
      done: true,
      current: !materialsReady && pathname.startsWith("/today"),
    },
    {
      id: "materials",
      label: "Lessons",
      href: "/materials",
      done: concepts.length > 0,
      current: !concepts.length,
    },
    {
      id: "check",
      label: "Check",
      href: "/today",
      done: state.diagnosisCompleted,
      current: concepts.length > 0 && !state.diagnosisCompleted,
    },
    {
      id: "today",
      label: "Today",
      href: "/today",
      done: studyReady,
      current: studyReady,
    },
  ];

  return (
    <aside className={`course-masthead${studyReady ? " is-study-ready" : " is-first-run"}`} aria-label="Current course">
      <div className="course-masthead-identity">
        <p className="course-masthead-kicker">Current course</p>
        <h2 className="course-masthead-title">{course.name}</h2>
        <p className="course-masthead-exam">
          {exam.target}
          <span aria-hidden="true"> · </span>
          {days} day{days === 1 ? "" : "s"} left
          {state.diagnosisCompleted ? (
            <>
              <span aria-hidden="true"> · </span>
              <span title="Estimate from your familiarity ratings and recall checks — not a grade prediction.">
                {percent(readiness)} Est. readiness
              </span>
            </>
          ) : null}
        </p>
      </div>

      {!studyReady ? (
        <ol className="workbench-chapters" aria-label="Getting started">
          {chapters.map((chapter, index) => (
            <li key={chapter.id} className={chapter.done && !chapter.current ? "is-done" : chapter.current ? "is-current" : undefined}>
              <Link href={chapter.href} aria-current={chapter.current ? "step" : undefined}>
                <span className="workbench-chapter-index" aria-hidden="true">{index + 1}</span>
                {chapter.label}
              </Link>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="course-masthead-phase">
        <span>Now</span>
        <Link href={phase.href} aria-current="step">
          {phase.label}
        </Link>
        {!materialsReady && concepts.length === 0 ? (
          <span className="course-masthead-hint">Sample course model ready when you try the sample</span>
        ) : null}
      </p>
    </aside>
  );
}
