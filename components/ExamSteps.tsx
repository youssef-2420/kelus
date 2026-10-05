import Link from "next/link";
import type { Concept, LearningActivity, RoutePlan, StudySession } from "@/domain/types";
import { forecastReadiness } from "@/domain/forecast";
import { estimatedReadiness } from "@/domain/readiness";
import styles from "./ExamSteps.module.css";

function cite(activity: LearningActivity | undefined) {
  const source = activity?.sourceReferences[0];
  if (!source) return null;
  const locator = source.locator?.trim();
  return locator && !/not your upload/i.test(locator) ? `${source.label} · ${locator}` : source.label;
}

/**
 * The whole product in three steps, each with a live preview built from the learner's own course:
 * 1. the exam map from their sources, 2. a practice question from their pages, 3. readiness over time.
 */
export function ExamSteps({
  concepts,
  activities,
  route,
  sessions,
  targetPercent,
  daysToExam,
}: {
  concepts: Concept[];
  activities: LearningActivity[];
  route: RoutePlan;
  sessions: StudySession[];
  targetPercent: number;
  daysToExam: number;
}) {
  const totalWeight = concepts.reduce((sum, concept) => sum + Math.max(0, concept.examImportance), 0) || 1;
  const top = concepts.slice().sort((a, b) => b.examImportance - a.examImportance).slice(0, 3);
  const sourceCount = new Set(activities.flatMap((activity) => activity.sourceReferences.map((source) => source.materialId))).size;
  const firstId = route.allocations.find((item) => item.conceptId !== "mixed-retrieval")?.conceptId;
  const firstConcept = concepts.find((concept) => concept.id === firstId);
  const firstActivity = activities.find((activity) => activity.conceptId === firstId);
  const question = firstActivity?.retrieve.prompt;
  const completed = sessions.filter((session) => session.status === "complete").length;

  const readiness = estimatedReadiness(concepts);
  const forecast = forecastReadiness({ sessions, readiness, targetPercent, daysToExam });
  const now = Math.round(readiness * 100);
  const target = Math.round(targetPercent);
  const projected = forecast.state === "projected" ? Math.round(forecast.projected * 100) : null;

  // Chart: x = today → exam day, y = 0–100%.
  const y = (value: number) => 92 - Math.max(0, Math.min(100, value)) * 0.84;

  return (
    <section className={styles.steps} aria-labelledby="exam-steps-title">
      <h2 id="exam-steps-title" className={styles.title}>Your exam in three steps</h2>
      <ol className={styles.list}>
        <li className={`${styles.step} ${styles.isDone}`}>
          <span className={styles.marker} aria-hidden="true">✓</span>
          <div className={styles.body}>
            <h3>Drop it in</h3>
            <p className={styles.value}>
              {concepts.length} topic{concepts.length === 1 ? "" : "s"} ranked by exam weight
              {sourceCount ? `, from ${sourceCount} source${sourceCount === 1 ? "" : "s"}` : ""}.
            </p>
            <ul className={styles.map} aria-label="Heaviest topics">
              {top.map((concept) => {
                const share = Math.round((Math.max(0, concept.examImportance) / totalWeight) * 100);
                const source = cite(activities.find((activity) => activity.conceptId === concept.id));
                return (
                  <li key={concept.id}>
                    <span className={styles.name}>{concept.name}</span>
                    <span className={styles.bar} aria-hidden="true"><i style={{ width: `${Math.min(100, share * 3)}%` }} /></span>
                    <span className={styles.share}>{share}%</span>
                    {source ? <small>{source}</small> : null}
                  </li>
                );
              })}
            </ul>
            <Link className={styles.more} href="/today?section=map">See every topic <span aria-hidden="true">→</span></Link>
          </div>
        </li>

        <li className={`${styles.step} ${completed === 0 ? styles.isCurrent : styles.isDone}`}>
          <span className={styles.marker} aria-hidden="true">{completed === 0 ? "2" : "✓"}</span>
          <div className={styles.body}>
            <h3>Practice it</h3>
            <p className={styles.value}>
              {firstConcept ? `A question on ${firstConcept.name}, written from your own pages.` : "Questions written from your own pages."}
            </p>
            {question ? (
              <figure className={styles.question}>
                <blockquote>{question}</blockquote>
                <div className={styles.lines} aria-hidden="true"><span /><span /><span /></div>
                <figcaption>
                  {cite(firstActivity) ? <>Marked against {cite(firstActivity)}</> : "Marked against your sources"}
                </figcaption>
              </figure>
            ) : null}
          </div>
        </li>

        <li className={`${styles.step} ${completed > 0 ? styles.isCurrent : ""}`}>
          <span className={styles.marker} aria-hidden="true">3</span>
          <div className={styles.body}>
            <h3>Watch it move</h3>
            <p className={styles.value}>
              {forecast.state === "projected"
                ? projected !== null && projected >= target
                  ? `At one session a day you reach about ${projected}% by the exam, past your ${target}% target.`
                  : `At one session a day you reach about ${projected}% by the exam. Your target is ${target}%.`
                : forecast.state === "flat"
                  ? "Your last sessions held steady. Retrieve the weak topics first to move the line."
                  : "Finish one session and Kelus shows where you will be on exam day."}
            </p>
            <figure className={styles.chart}>
              <svg viewBox="0 0 240 100" role="img" aria-label={`Readiness now ${now} percent, target ${target} percent${projected !== null ? `, projected ${projected} percent` : ""}`}>
                <line className={styles.targetLine} x1="8" x2="232" y1={y(target)} y2={y(target)} />
                <text className={styles.chartLabel} x="232" y={y(target) - 4} textAnchor="end">Target {target}%</text>
                {projected !== null ? <line className={styles.projection} x1="24" y1={y(now)} x2="216" y2={y(projected)} /> : null}
                <circle className={styles.dot} cx="24" cy={y(now)} r="4.5" />
                <text className={styles.chartLabel} x="32" y={y(now) + 14}>Now {now}%</text>
                {projected !== null ? <circle className={styles.dotEnd} cx="216" cy={y(projected)} r="4.5" /> : null}
                <text className={styles.chartLabel} x="8" y="99">Today</text>
                <text className={styles.chartLabel} x="232" y="99" textAnchor="end">Exam · {daysToExam}d</text>
              </svg>
            </figure>
            {forecast.state === "projected" && forecast.sessionsToTarget ? (
              <p className={styles.note}>About {forecast.sessionsToTarget} more session{forecast.sessionsToTarget === 1 ? "" : "s"} to reach {target}%, based on your last {forecast.sessionsCounted}.</p>
            ) : null}
          </div>
        </li>
      </ol>
    </section>
  );
}
