import { SafeLink as Link } from "@/components/SafeLink";
import { Icon } from "@/components/Icon";
import type { TrustConfidence } from "@/types/kelus";

const copy: Record<TrustConfidence | "UNAVAILABLE", { title: string; body: string }> = {
  HIGH: {
    title: "High confidence",
    body: "Strong product match, seller feedback, shipping, and return evidence.",
  },
  MEDIUM: {
    title: "Medium confidence",
    body: "The configuration matches, but some seller or market evidence is limited.",
  },
  LOW: {
    title: "Low confidence",
    body: "Important listing evidence is missing or needs stronger validation.",
  },
  UNAVAILABLE: {
    title: "Confidence unavailable",
    body: "Kelus does not have enough evidence to score this offer yet.",
  },
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ConfidenceBadge({ confidence, compact = false }: { confidence: TrustConfidence | "UNAVAILABLE"; compact?: boolean }) {
  const detail = copy[confidence];
  if (compact) {
    return <span className="confidence-badge is-compact" title={`${detail.title}: ${detail.body}`}>{titleCase(confidence.toLowerCase())}</span>;
  }
  return (
    <div className="confidence-badge">
      <p className="confidence-badge-label">{titleCase(confidence.toLowerCase())} confidence</p>
      <p className="confidence-badge-body">{detail.body}</p>
      <Link className="confidence-badge-link" href="/methodology">How Kelus scores confidence <Icon name="arrow" size={12} /></Link>
    </div>
  );
}
