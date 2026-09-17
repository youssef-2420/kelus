"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import {
  getMaterialsSnapshot,
  getServerMaterialsSnapshot,
  subscribeMaterials,
} from "@/lib/material-store";

/**
 * Quiet course continuity during first-run chapters.
 * After diagnosis, RevisionSurface owns the course brief — this rail stays out.
 */
export function CourseWorkspaceRail() {
  const { state } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const course = state.snapshot.courses[0];
  const exam = state.snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!state.onboardingCompleted || !course || !exam) return null;

  const concepts = state.snapshot.concepts.filter((item) => item.courseId === course.id);
  const sourceCount = materials.filter((item) => item.courseId === course.id).length;
  const materialsReady = sourceCount > 0 || concepts.length > 0;
  const studyReady = state.diagnosisCompleted && concepts.length > 0;

  if (studyReady) return null;

  const days = daysUntilExam(exam, state.nowIso);

  const phase = !materialsReady
    ? { label: "Add materials", href: "/today" as const }
    : !concepts.length
      ? { label: "Confirm topics", href: "/today" as const }
      : { label: "Quick check", href: "/today" as const };

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
      current: false,
    },
    {
      id: "materials",
      label: "Lessons",
      href: "/today",
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
      done: false,
      current: false,
    },
  ];

  return (
    <aside className="course-masthead is-first-run" aria-label="Current course">
      <div className="course-masthead-identity">
        <p className="course-masthead-kicker">Current course</p>
        <h2 className="course-masthead-title">{course.name}</h2>
        <p className="course-masthead-exam">
          {exam.target}
          <span aria-hidden="true"> · </span>
          {days} day{days === 1 ? "" : "s"} left
        </p>
      </div>

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
