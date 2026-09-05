import Link from "next/link";
import { KelusHero } from "@/components/hero/KelusHero";
import { HomeAfterHero } from "@/components/home/HomeAfterHero";
import { KnowledgeRouteStory } from "@/components/home/KnowledgeRouteStory";

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
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </header>

      <main id="main">
        <KelusHero />
        <KnowledgeRouteStory />
        <HomeAfterHero />
      </main>
    </div>
  );
}
