import { Icon } from "@/components/Icon";

const steps = [
  {
    icon: "search" as const,
    label: "Search",
    description: "Pick the exact product and configuration",
  },
  {
    icon: "star" as const,
    label: "Compare",
    description: "See known totals and Kelus’s verified pick",
  },
  {
    icon: "bell" as const,
    label: "Track",
    description: "Set a target price and get alerted",
  },
];

export function HomeTaskPath() {
  return (
    <ol className="home-task-path" aria-label="How Kelus works in three steps">
      {steps.map((step, index) => (
        <li key={step.label} className="home-task-step">
          <span className="home-task-step-icon" aria-hidden="true">
            <Icon name={step.icon} size={17} />
          </span>
          <span className="home-task-step-copy">
            <span className="home-task-step-label">
              <span className="home-task-step-number">{index + 1}</span>
              {step.label}
            </span>
            <span className="home-task-step-description">{step.description}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
