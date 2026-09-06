"use client";

import type { ReactNode } from "react";
import { CourseWorkspaceRail } from "@/components/CourseWorkspaceRail";
import { useLearner } from "@/components/LearnerProvider";

export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const { state } = useLearner();
  if (!state.onboardingCompleted) {
    return <div className="shell">{action ? <div className="shell-context-action">{action}</div> : null}<main id="main">{children}</main></div>;
  }
  return (
    <div className="course-workspace-layout">
      <CourseWorkspaceRail />
      <div className="shell course-workspace-content">
        {action ? <div className="shell-context-action">{action}</div> : null}
        <main id="main">{children}</main>
      </div>
    </div>
  );
}
