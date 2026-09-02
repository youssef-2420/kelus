import { SafeLink as Link } from "@/components/SafeLink";
import { Icon } from "@/components/Icon";

const learnItems = [
  {
    icon: "search",
    title: "Name the exact product",
    description: "Choose the model, configuration, and condition you actually want.",
  },
  {
    icon: "shield",
    title: "Reject the messy listings",
    description: "Wrong variants, unknown totals, and suspicious offers do not become Our Pick.",
  },
  {
    icon: "check",
    title: "Get one clear answer",
    description: "See the recommended offer, the known total, and the evidence behind it.",
  },
];

export function HomeLearnSection() {
  return (
    <section className="home-learn section" aria-label="Learn about Kelus">
      <header className="home-learn-head">
        <p>How Kelus gets to one answer</p>
        <h2>The complicated checks happen before you click.</h2>
      </header>
      <div className="home-learn-grid">
        {learnItems.map((item, index) => (
          <article key={item.title} className="home-learn-column">
            <span className="home-learn-icon" aria-hidden="true"><Icon name={item.icon} size={20} /></span>
            <div>
              <small>0{index + 1}</small>
              <h3>{item.title}</h3>
            </div>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
      <nav className="home-learn-links" aria-label="Learn more about Kelus">
        <Link className="home-learn-link" href="/how-it-works">How Kelus works <Icon name="arrow" size={14} /></Link>
        <Link className="home-learn-link" href="/methodology">How Kelus picks <Icon name="arrow" size={14} /></Link>
      </nav>
    </section>
  );
}
