import Link from "next/link";

type Props = {
  current?: "home" | "route";
};

export function HomeHeader({ current }: Props) {
  return (
    <header className="home-bar">
      <Link href="/" className="mark">
        Kelus
      </Link>
      <nav className="home-nav" aria-label="Primary">
        <Link href="/today">Today</Link>
        <Link href="/map">Map</Link>
        <Link href="/route" aria-current={current === "route" ? "page" : undefined}>
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
  );
}
