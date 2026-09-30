"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";

type Stage = "exam" | "sources" | "check";

const STAGES = [
  { id: "exam", label: "Exam" },
  { id: "sources", label: "Sources" },
  { id: "check", label: "First check" },
  { id: "route", label: "Today" },
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
    <section className="kelus-space is-studio studio-onboarding" aria-label="Set up your course">
      <aside className="studio-rail" aria-label="Course workspace">
        <Link href="/" className="studio-brand" aria-label="Kelus home">kelus<span aria-hidden="true">↗</span></Link>
        <div className="studio-course">
          <span className="studio-rail-label">Your course</span>
          <strong title={courseName || "New course"}>{courseName || "New course"}</strong>
          <span>{stage === "exam" ? "Getting started" : "Setting up your route"}</span>
        </div>
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
          ) : auth.configured ? (
            <button type="button" className="studio-account-action" onClick={auth.openDialog}>Sign in to sync</button>
          ) : null}
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <span className="studio-topbar-course">{courseName || "New course"}</span>
          <span className="studio-topbar-status">Private course</span>
        </header>
        <div className="studio-cover" role="img" aria-label="Open study book on a desk" />
        <main id="main" className="studio-page kelus-space-stage">
          <header className="studio-page-heading">
            <span className="studio-eyebrow">Course workspace</span>
            <p className="studio-page-course">{courseName || "New course"}</p>
            <p className="studio-page-description">{stage === "exam" ? "Set your exam, then bring in the lessons you want to revise." : "Your sources, topics, and next revision session in one place."}</p>
          </header>
          <div className="studio-onboarding-content">{children}</div>
        </main>
      </div>
    </section>
  );
}
