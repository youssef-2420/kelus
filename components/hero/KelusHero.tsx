import Link from "next/link";
import { StudentIllustration } from "./StudentIllustration";

export function KelusHero() {
  return (
    <section className="kelus-hero home-hero is-student">
      <div className="kelus-hero-copy home-copy">
        <p className="kicker">For the student at the desk</p>
        <h1>
          Know what to
          <br />
          learn next.
        </h1>
        <p className="home-lede">
          Sit down with your exam. Kelus decides the route from here — so you don’t spend the evening choosing.
        </p>
        <div className="home-actions">
          <Link href="/today" className="cta home-cta">
            Start today’s plan
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <a href="#route" className="home-secondary">
            See the route
          </a>
        </div>
      </div>

      <div className="kelus-hero-art">
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-student-wrap">
          <StudentIllustration className="hero-student" />
        </div>
      </div>
    </section>
  );
}
