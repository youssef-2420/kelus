import { Icon } from "@/components/Icon";
import { HomepageSocialProof } from "@/components/HomepageSocialProof";

const benefits = [
  { icon: "history" as const, label: "Checked every 15 min" },
  { icon: "shield" as const, label: "Validated sellers" },
  { icon: "tag" as const, label: "Known totals" },
  { icon: "search" as const, label: "Independent picks" },
];

export function HomeTrustStrip() {
  return (
    <div className="home-trust-strip">
      <HomepageSocialProof />
      <ul className="home-trust-benefits" aria-label="How Kelus compares offers">
        {benefits.map((item) => (
          <li key={item.label}><Icon name={item.icon} size={16} />{item.label}</li>
        ))}
      </ul>
    </div>
  );
}
