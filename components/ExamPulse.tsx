import styles from "./ExamPulse.module.css";

/**
 * The same three facts on every core page: where you are, where you're aiming, how long you have.
 * Readiness is an estimate from your answers, so it says so.
 */
export function ExamPulse({ readiness, targetPercent, daysToExam, datePending = false }: { readiness: number; targetPercent: number; daysToExam: number; datePending?: boolean }) {
  const ready = Math.round(Math.max(0, Math.min(1, readiness)) * 100);
  const target = Math.round(Math.max(0, Math.min(100, targetPercent)));
  return (
    <div className={styles.pulse} role="group" aria-label="Exam readiness">
      <div className={styles.fact}>
        <strong>{ready}%</strong>
        <span>Estimated ready</span>
      </div>
      <div className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${ready}%` }} />
        {datePending ? null : <i className={styles.target} style={{ left: `${target}%` }} />}
      </div>
      {/* The target is chosen with the exam date; before that nobody has set one, so none is shown. */}
      {datePending ? null : (
        <div className={styles.fact}>
          <strong>{target}%</strong>
          <span>Your target</span>
        </div>
      )}
      <div className={styles.fact}>
        {/* Without a real exam date there is no countdown to show, only a placeholder. */}
        <strong>{datePending ? "—" : daysToExam}</strong>
        <span>{datePending ? "No exam date" : daysToExam === 1 ? "day left" : "days left"}</span>
      </div>
    </div>
  );
}
