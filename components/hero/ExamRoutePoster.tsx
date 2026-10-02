import styles from "./MarkedScriptHero.module.css";

/** One legible revision moment, rather than an animated map of the whole course. */
export function ExamRoutePoster() {
  return (
    <figure
      className={styles.script}
      role="img"
      aria-label="Illustrative Microeconomics study sheet: a note about substitutes becomes a recall question. After an answer needs another attempt, Elasticity moves to the top of today's route."
    >
      <div className={styles.sheet} aria-hidden="true">
        <div className={styles.sheetTopline}>
          <span>Microeconomics</span>
          <span>Sample study sheet</span>
        </div>

        <div className={styles.note}>
          <span className={styles.noteLabel}>From the lesson</span>
          <p>Close substitutes make demand <span className={styles.highlight}>more responsive</span> to a price change.</p>
        </div>

        <div className={styles.recall}>
          <span className={styles.recallLabel}>Try to recall</span>
          <p>Why does having another option make demand more elastic?</p>
          <div className={styles.answerLines} aria-hidden="true"><span /><span /></div>
        </div>

        <div className={styles.nextStep}>
          <span className={styles.nextLabel}>After a shaky answer</span>
          <strong>Elasticity moves to the top of the route <span aria-hidden="true">↗</span></strong>
        </div>
      </div>
      <figcaption className={styles.caption}>An illustrative example. Your route responds to your own material and answers.</figcaption>
    </figure>
  );
}
