import Link from "next/link";
import { RouteStory } from "@/components/home/RouteStory";

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
      </header>

      <main id="main">
        <RouteStory />
      </main>
    </div>
  );
}
