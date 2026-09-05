"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { estimatedReadiness } from "@/domain/readiness";
import { percent } from "@/lib/format";
import { getMaterialsSnapshot, getServerMaterialsSnapshot, subscribeMaterials } from "@/lib/material-store";

const workspaceLinks = [
  { href: "/today", label: "Today", matches: ["/today", "/session"] },
  { href: "/map", label: "Knowledge Map", matches: ["/map", "/concept"] },
  { href: "/materials", label: "Materials", matches: ["/materials"] },
] as const;

export function CourseWorkspaceRail() {
  const pathname = usePathname();
  const { state } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const course = state.snapshot.courses[0];
  const exam = state.snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!state.onboardingCompleted || !course || !exam) return null;

  const concepts = state.snapshot.concepts.filter((item) => item.courseId === course.id);
  const sourceCount = materials.filter((item) => item.courseId === course.id).length;
  const readiness = estimatedReadiness(concepts);
  const days = daysUntilExam(exam, state.nowIso);
  const currentStep = state.diagnosisCompleted ? 5 : !sourceCount ? 2 : !concepts.length ? 3 : 4;

  const stages = [
    { label: "Destination", detail: `${days} days · target ${exam.targetPercent}%`, href: "/today" },
    { label: "Materials", detail: sourceCount ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}` : "Add your first source", href: "/materials" },
    { label: "Knowledge Map", detail: concepts.length ? `${concepts.length} concepts` : "Waiting for concepts", href: "/map" },
    { label: "Diagnosis", detail: state.diagnosisCompleted ? "Initial evidence captured" : "Next step", href: "/today" },
    { label: "Today’s route", detail: state.diagnosisCompleted ? `${percent(readiness)} ready` : "Builds after diagnosis", href: "/today" },
  ];

  return (
    <aside className="course-workspace-rail" aria-label="Current course workspace">
      <div className="course-workspace-identity">
        <span>Current course</span>
        <strong>{course.name}</strong>
        <small>{exam.target}</small>
      </div>

      <nav className="course-workspace-nav" aria-label="Course navigation">
        {workspaceLinks.map((item) => {
          const active = item.matches.some((prefix) => pathname.startsWith(prefix));
          return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
        })}
      </nav>

      <div className="course-workspace-progress">
        <div><span>Course path</span><b>{currentStep} / 5</b></div>
        <ol>
          {stages.map((stage, index) => {
            const complete = index + 1 < currentStep;
            const current = index + 1 === currentStep;
            return (
              <li key={stage.label} className={complete ? "is-complete" : current ? "is-current" : undefined}>
                <Link href={stage.href} aria-current={current ? "step" : undefined}>
                  <i aria-hidden="true">{complete ? "✓" : String(index + 1).padStart(2, "0")}</i>
                  <span><strong>{stage.label}</strong><small>{stage.detail}</small></span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
