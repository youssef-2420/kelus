"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { KelusLogoMark } from "@/components/KelusLogoMark";

type Stage = "upload" | "exam" | "confirm" | "check";

const STAGES = [
  { id: "upload", label: "Add PDF" },
  { id: "exam", label: "Exam" },
  { id: "confirm", label: "Confirm topics" },
  { id: "check", label: "First check" },
  { id: "route", label: "Study plan" },
] as const;

export function CourseStudioOnboarding({ stage, courseName, children }: {
  stage: Stage;
  courseName?: string;
  children: ReactNode;
}) {
  const auth = useAuth();
  const currentIndex = STAGES.findIndex((item) => item.id === stage);

  useEffect(() => {
    document.body.classList.add("is-kelus-space", "is-booklet-page", "is-course-studio");
    return () => document.body.classList.remove("is-kelus-space", "is-booklet-page", "is-course-studio");
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);

  return (
    <section className="kelus-space is-studio studio-onboarding" data-stage={stage} aria-label="Set up your course">
      <aside className="studio-rail" aria-label="Course workspace">
        <Link href="/" className="studio-brand" aria-label="Kelus home">
          <span className="studio-brand-identity"><KelusLogoMark /><strong>kelus</strong></span>
          <span aria-hidden="true">↗</span>
        </Link>
        <p className="studio-rail-label studio-navigation-label">Getting started</p>
        <ol className="studio-onboarding-steps" aria-label="Setup progress">
          {STAGES.map((item, index) => (
            <li key={item.id} className={index === currentIndex ? "is-current" : index < currentIndex ? "is-done" : undefined} aria-current={index === currentIndex ? "step" : undefined}>
              <span aria-hidden="true">{index < currentIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>{item.label}
            </li>
          ))}
        </ol>
        <div className="studio-rail-bottom">
          <Link href="/" className="studio-home-link">← Back to Kelus</Link>
          {auth.user ? (
            <button type="button" className="studio-account-action" onClick={() => auth.signOut()}>Sign out</button>
          ) : null}
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <span className="studio-topbar-course">{courseName || "New course"}</span>
          <span className="studio-topbar-status">Step {currentIndex + 1} of {STAGES.length}</span>
        </header>
        <main id="main" className="studio-page kelus-space-stage">
          <div className="studio-onboarding-content">{children}</div>
        </main>
      </div>
    </section>
  );
}
