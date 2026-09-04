import Link from "next/link";
import { LearningRouteEngine } from "@/components/hero/LearningRouteEngine";

export default function Home() {
  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="mark">
          Kelus
        </Link>
        <Link href="/today" className="home-bar-link">
          Open demo
        </Link>
      </header>

      <section className="home-hero">
        <div className="home-copy">
          <p className="kicker">Learning navigation</p>
          <h1>
            Know where you’re going.
            <br />
            Know what to learn next.
          </h1>
          <p className="home-lede">
            Kelus maps the best route from what you know today to your learning goal — and reroutes as you improve.
          </p>
          <div className="home-actions">
            <Link href="/today" className="cta home-cta">
              Build my route
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <a href="#learning-route" className="home-secondary">
              See how it works
            </a>
          </div>
          <p className="home-support">No decks. No guesswork. Just the next best step.</p>
        </div>

        <LearningRouteEngine />
      </section>
    </div>
  );
}
