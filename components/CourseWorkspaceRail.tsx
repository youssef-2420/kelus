"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useLearner } from "@/components/LearnerProvider";
import { estimatedReadiness } from "@/domain/readiness";
import { percent } from "@/lib/format";
import { getMaterialsSnapshot, getServerMaterialsSnapshot, subscribeMaterials } from "@/lib/material-store";

const workspaceLinks = [
  { href: "/today", label: "Today", matches: ["/today", "/session"] },
  { href: "/map", label: "Map", matches: ["/map", "/concept"] },
  { href: "/materials", label: "Materials", matches: ["/materials"] },
] as const;

function StageContent({ complete, index, label, detail }: { complete: boolean; index: number; label: string; detail: string }) {
  return (
    <>
      <i aria-hidden="true">{complete ? "✓" : String(index + 1).padStart(2, "0")}</i>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </>
  );
}

export function CourseWorkspaceRail() {
  const pathname = usePathname();
  const { state } = useLearner();
  const materials = useSyncExternalStore(subscribeMaterials, getMaterialsSnapshot, getServerMaterialsSnapshot);
  const course = state.snapshot.courses[0];
  const exam = state.snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);

  if (!state.onboardingCompleted || !course || !exam) return null;

  const concepts = state.snapshot.concepts.filter((item) => item.courseId === course.id);
  const sourceCount = materials.filter((item) => item.courseId === course.id).length;
  const materialsReady = sourceCount > 0 || concepts.length > 0;
  const readiness = estimatedReadiness(concepts);
  const sessions = state.snapshot.sessions.filter((session) => session.courseId === course.id);
  const completedSession = sessions.some((session) => session.status === "complete");
  const activeSession = sessions.some((session) => session.status === "in_progress");
  const currentStep = !materialsReady ? 1 : !concepts.length ? 2 : !state.diagnosisCompleted ? 3 : activeSession ? 5 : completedSession ? 7 : 4;

  const stages = [
    {
      label: "Materials",
      detail: sourceCount
        ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}`
        : concepts.length
          ? "Sample course model ready"
          : "Add your first source",
      href: "/materials",
    },
    { label: "Concepts", detail: concepts.length ? `${concepts.length} confirmed` : "Confirm what Kelus found", href: "/materials" },
    { label: "Diagnosis", detail: state.diagnosisCompleted ? "Initial evidence captured" : "Next step", href: "/today" },
    { label: "Route", detail: state.diagnosisCompleted ? `${percent(readiness)} estimated readiness` : "Builds after diagnosis", href: "/today" },
    { label: "Study", detail: activeSession ? "Session in progress" : completedSession ? "First session complete" : "Learn, retrieve, apply", href: "/today" },
    { label: "Evaluation", detail: completedSession ? "Answer evidence recorded" : "Checks reasoning", href: "/today" },
    { label: "Rerouting", detail: completedSession ? "Next route recalculated" : "Adapts after evidence", href: "/today" },
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
        <div><span>Learning loop</span><b>{currentStep} / 7</b></div>
        <ol>
          {stages.map((stage, index) => {
            const complete = index + 1 < currentStep;
            const current = index + 1 === currentStep;
            const body = <StageContent complete={complete} index={index} label={stage.label} detail={stage.detail} />;
            let marker: ReactNode;
            if (current) {
              marker = (
                <Link href={stage.href} aria-current="step">
                  {body}
                </Link>
              );
            } else {
              marker = <span className="course-stage">{body}</span>;
            }
            return (
              <li key={stage.label} className={complete ? "is-complete" : current ? "is-current" : undefined}>
                {marker}
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
