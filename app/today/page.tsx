"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { InitialDiagnosis } from "@/components/InitialDiagnosis";
import { ease, RouteKnowledgeMap, ROUTE_BEATS } from "@/components/RouteKnowledgeMap";
import { TodayRoute } from "@/components/TodayRoute";
import { useLearner } from "@/components/LearnerProvider";
import { daysUntilExam } from "@/domain/scheduler";
import { estimatedReadiness } from "@/domain/readiness";
import { generateRoute } from "@/domain/routing-engine";
import { greeting } from "@/lib/format";

export default function TodayPage() {
  const { state, completeSetup, completeDiagnosis, useDemo } = useLearner();
  if (!state.onboardingCompleted) return <FirstRunSetup onComplete={completeSetup} onUseDemo={useDemo} />;
  if (!state.diagnosisCompleted) return <InitialDiagnosis snapshot={state.snapshot} onComplete={completeDiagnosis} />;
  return <TodayStage />;
}

function TodayStage() {
  const router = useRouter();
  const { state, start } = useLearner();
  const reduce = useReducedMotion();

  const { snapshot, nowIso } = state;
  const course = snapshot.courses[0];
  const exam = snapshot.exams.find((item) => item.courseId === course?.id && item.isActive);
  if (!course || !exam) return <AppShell><p>No active destination.</p></AppShell>;
  const concepts = snapshot.concepts.filter((concept) => concept.courseId === course.id);
  const route = generateRoute({ concepts, relationships: snapshot.relationships, events: snapshot.events, exam, nowIso });
  const readiness = estimatedReadiness(concepts);
  const days = daysUntilExam(exam, nowIso);
  const courseId = course.id;
  const examId = exam.id;

  function begin() {
    const sessionId = start(courseId, examId);
    sessionStorage.setItem("kelus-session-before", JSON.stringify(concepts));
    router.push(`/session?id=${sessionId}`);
  }

  return (
    <AppShell>
      <div className="today-stage">
        <motion.header
          className="today-dest"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
        >
          <h1>{exam.target}</h1>
          <p className="today-dest-meta">
            <span>
              <b>{days}</b> days to go
            </span>
            <span>Target {exam.targetPercent}%</span>
          </p>
          <p className="today-greeting">{greeting(nowIso)}.</p>
          <p className="today-lede">
            You have {route.availableMinutes} minutes.
            <br />
            Here’s where they matter most.
          </p>
        </motion.header>

        <RouteKnowledgeMap concepts={concepts} route={route} readiness={readiness} target={exam.targetPercent} />

        <TodayRoute route={route} concepts={concepts} />

        <motion.div
          className="today-primary-action"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease, delay: reduce ? 0 : ROUTE_BEATS.plan + 0.28 }}
        >
          <button type="button" className="cta" onClick={begin}>
            Start route <span aria-hidden="true">→</span>
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
}
