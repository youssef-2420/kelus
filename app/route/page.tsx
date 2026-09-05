import type { Metadata } from "next";
import Link from "next/link";
import { RouteStory } from "@/components/home/RouteStory";

export const metadata: Metadata = {
  title: "Kelus — Your learning has a route",
  description: "Watch Kelus choose a route from where you are, the time you have, and what the exam actually rewards.",
  alternates: { canonical: "/route" },
};

export default function RoutePage() {
  return (
    <div className="home route-page">
      <header className="home-bar">
        <Link href="/" className="mark">
          Kelus
        </Link>
        <nav className="home-nav" aria-label="Primary">
          <Link href="/today">Today</Link>
          <Link href="/map">Map</Link>
          <Link href="/route" aria-current="page">
            Route
          </Link>
        </nav>
        <Link href="/today" className="cta home-cta compact">
          Start
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </header>

      <main id="main">
        <RouteStory />
      </main>
    </div>
  );
}
