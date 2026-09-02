import { Fragment } from "react";
import { Icon } from "@/components/Icon";
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
        {learnItems.map((item, index) => (
          <Fragment key={item.href}>
            <article className="home-learn-column">
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <Link className="home-learn-link" href={item.href}>{item.cta} <Icon name="arrow" size={14} /></Link>
            </article>
            {index === 0 ? (
              <span className="home-learn-flow" aria-hidden="true">
                <span />
                <Icon name="arrow" size={18} />
              </span>
            ) : null}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
