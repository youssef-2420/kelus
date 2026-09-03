import { SafeLink as Link } from "@/components/SafeLink";

const steps = [
  {
    title: "Match the exact setup",
    copy: "Same model, storage, color, and condition — not a close-enough listing.",
  },
  {
    title: "Use known totals",
    copy: "Listing plus shipping when both are known. Unknown shipping stays unknown.",
  },
  {
    title: "Recommend one pick",
    copy: "The offer that passed seller and match checks — not just the lowest price.",
  },
];

export function HomeDeskPass() {
  return (
    <div className="desk-pass">
      <ol>
        {steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.copy}</span>
          </li>
        ))}
      </ol>
      <Link className="desk-pass-link" href="/methodology">
        How we choose Our Pick
      </Link>
    </div>
  );
}
