import Link from "next/link";
import { LeverageBoard } from "@/components/home/LeverageBoard";

export function HomeAfterHero() {
  return (
    <>
      <section className="home-argument" aria-labelledby="argument-title">
        <svg className="home-continue-route" viewBox="0 0 72 96" aria-hidden="true">
          <path
            d="M 36 0 C 36 28, 18 46, 28 64 C 38 82, 36 88, 36 96"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <div className="home-argument-inner">
          <p className="kicker">Many possible paths. One intelligent route.</p>
          <h2 id="argument-title">Stop deciding what to study.</h2>
          <p>
            <span aria-hidden="true">↳</span> Kelus recalculates the highest-value learning action from your goal,
            knowledge, retention, and time.
          </p>
        </div>
      </section>

      <section id="how" className="home-workbench" aria-labelledby="workbench-title">
        <div className="workbench-intro">
          <p className="kicker">One plan, three signals</p>
          <h2 id="workbench-title">
            Small inputs.
            <br />
            A plan with an opinion.
          </h2>
          <p>No giant task list. Kelus uses what matters for the exam, what feels weak, and what has gone untouched.</p>
          <Link href="/today">
            Set up your exam <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ol className="workbench-stages">
          <li>
            <div>
              <header>
                <span>01</span>
                <h3>Find the leverage</h3>
              </header>
              <LeverageBoard />
            </div>
          </li>
          <li>
            <div>
              <header>
                <span>02</span>
                <h3>Fit the time you have</h3>
              </header>
              <div className="time-board">
                <p className="engine-label">Today · Microeconomics</p>
                <div>
                  <strong>45 focused minutes</strong>
                  <b>
                    45<span>m</span>
                  </b>
                </div>
                <ol>
                  <li>
                    <span>01</span>
                    <p>
                      <b>Elasticity</b>
                      <small>High-value gap</small>
                    </p>
                    <strong>20 min</strong>
                  </li>
                  <li>
                    <span>02</span>
                    <p>
                      <b>Externalities</b>
                      <small>High-value gap</small>
                    </p>
                    <strong>15 min</strong>
                  </li>
                  <li>
                    <span>03</span>
                    <p>
                      <b>Market structures</b>
                      <small>Needs a baseline</small>
                    </p>
                    <strong>10 min</strong>
                  </li>
                </ol>
              </div>
            </div>
          </li>
          <li>
            <div>
              <header>
                <span>03</span>
                <h3>Let the plan move</h3>
              </header>
              <div className="feedback-board">
                <div className="feedback-mark" aria-hidden="true">
                  ?
                </div>
                <div>
                  <p className="engine-label">After one question</p>
                  <strong>“Almost” is useful data.</strong>
                  <span>Kelus keeps the topic close, without starting the whole plan over.</span>
                </div>
                <footer>
                  <p>
                    Today <b>02</b>
                  </p>
                  <i aria-hidden="true">→</i>
                  <p>
                    Tomorrow <b>01</b>
                  </p>
                </footer>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-principles" aria-labelledby="principles-title">
        <div>
          <p className="kicker">What Kelus will not do</p>
          <h2 id="principles-title">No fake certainty.</h2>
        </div>
        <div>
          <dl>
            <div>
              <dt>Not a grade prediction</dt>
              <dd>Readiness reflects the confidence you report, weighted by exam importance.</dd>
            </div>
            <div>
              <dt>Not a content generator</dt>
              <dd>Kelus organizes your topics. It does not replace your lecturer, notes, or judgment.</dd>
            </div>
            <div>
              <dt>Not another streak</dt>
              <dd>Miss a day and the plan simply recalculates. No guilt, confetti, or broken chain.</dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="home-foot">
        <h2>Walk into the exam knowing what you worked on—and why.</h2>
        <div>
          <span className="mark">Kelus</span>
          <Link href="/today">
            Make today’s plan <span aria-hidden="true">→</span>
          </Link>
        </div>
      </footer>
    </>
  );
}
