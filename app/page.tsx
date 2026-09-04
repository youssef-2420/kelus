import Link from "next/link";
import { LearningRouteEngine } from "@/components/hero/LearningRouteEngine";

export default function Home() {
  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="mark">
          Kelus
        </Link>
        <nav className="home-nav" aria-label="Primary">
          <Link href="/today">Today</Link>
          <Link href="/map">Map</Link>
        </nav>
        <Link href="/today" className="cta home-cta compact">
          Start
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </header>

      <main id="main">
      <section className="home-hero">
        <div className="home-copy">
          <p className="kicker">Exam prep</p>
          <h1>Know what to study next.</h1>
          <p className="home-lede">
            Tell Kelus the exam. It looks at what you know, what’s fading, and the time you have — then gives you today’s plan.
          </p>
          <div className="home-actions">
            <Link href="/today" className="cta home-cta">
              Start today’s plan
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
            <a href="#how" className="home-secondary">
              How it works
            </a>
          </div>
        </div>
        <LearningRouteEngine />
      </section>

      <section id="how" className="home-how">
        <p className="kicker">How it works</p>
        <ol>
          <li>
            <span className="num">01</span>
            <div>
              <h2>Set the exam</h2>
              <p>Date, target, and how long you can study today.</p>
            </div>
          </li>
          <li>
            <span className="num">02</span>
            <div>
              <h2>Get a plan</h2>
              <p>Minutes assigned to the few topics that move the exam, not a dump of every weak card.</p>
            </div>
          </li>
          <li>
            <span className="num">03</span>
            <div>
              <h2>Study, then the plan moves</h2>
              <p>You rate how well you knew each question. Tomorrow’s order changes.</p>
            </div>
          </li>
        </ol>
      </section>

      <footer className="home-foot">
        <Link href="/today" className="cta home-cta">
          Open today’s plan
          <span className="arrow" aria-hidden="true">→</span>
        </Link>
        <p>No account. Works in the browser.</p>
      </footer>
      </main>
    </div>
  );
}
