import { SafeLink as Link } from "@/components/SafeLink";

const learnItems = [
  {
    title: "How Kelus works",
    description: "See how a search becomes a comparison of matching offers, with known totals and seller evidence surfaced up front.",
    href: "/how-it-works",
    cta: "Read the process",
  },
  {
    title: "How Kelus picks",
    description: "See the checks Kelus runs on product match, shipping, returns, seller trust, and price anomalies before recommending one offer.",
    href: "/methodology",
    cta: "Read the methodology",
  },
];

export function HomeLearnSection() {
  return (
    <section className="home-learn section" aria-label="Learn about Kelus">
      <div className="home-learn-grid">
        {learnItems.map((item) => (
          <article key={item.href} className="home-learn-column">
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <Link className="home-learn-link" href={item.href}>{item.cta}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
