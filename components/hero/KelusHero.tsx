import Link from "next/link";
import { ExamRoutePoster } from "./ExamRoutePoster";
import styles from "./MarkedScriptHero.module.css";

/**
 * Revision-sheet hero: one headline, one lede, one primary path.
 * Brand lives in the site header — not repeated in the hero.
 * The illustrated revision story follows below the fold.
 */
export function KelusHero() {
  return (
    <section className={`${styles.hero} is-poster`} aria-labelledby="home-hero-title" data-hero="marked-script">
      <div className={styles.copy}>
        <h1 id="home-hero-title" className={styles.headline}>
          Revise your lessons.{" "}
          <span className={styles.secondLine}>Walk into the exam ready.</span>
        </h1>

        <p className={styles.lede}>
          Recall from your notes. Check the answer. Your answer changes what you study next.
        </p>

        <div className={styles.actions}>
          <Link href="/today" className={styles.primary}>
            Set up <span className={styles.primaryArrow} aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className={styles.visual}>
        <ExamRoutePoster />
      </div>
    </section>
  );
}
