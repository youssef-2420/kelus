import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

const learnItems = [
  {
    icon: "grid" as const,
    title: "How Kelus works",
    description: "See how a search becomes a clear comparison of matching offers, with known totals and seller evidence surfaced up front.",
    href: "/how-it-works",
    cta: "View process",
  },
  {
    icon: "shield" as const,
    title: "How Kelus picks",
    description: "See the checks Kelus runs on product match, shipping, returns, seller trust, and price anomalies before recommending one offer.",
    href: "/methodology",
    cta: "View methodology",
  },
];

export function HomeLearnSection() {
  return (
    <section className="home-learn section" aria-label="Learn about Kelus">
      <div className="home-learn-grid">
        {learnItems.map((item) => (
          <article key={item.href} className="home-learn-column">
            <span className="home-learn-icon" aria-hidden="true"><Icon name={item.icon} size={22} /></span>
            <p><strong>{item.title}.</strong> {item.description}</p>
            <Link className="home-learn-link" href={item.href}>{item.cta} <Icon name="arrow" size={14} /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
