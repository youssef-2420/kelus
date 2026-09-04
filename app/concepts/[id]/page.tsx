import { createDemoSnapshot } from "@/data/demo-seed";
import { ConceptDetail } from "./ConceptDetail";

export function generateStaticParams() {
  return createDemoSnapshot(Date.parse("2026-09-03T12:00:00.000Z")).concepts.map((concept) => ({
    id: concept.id,
  }));
}

export default function ConceptPage() {
  return <ConceptDetail />;
}
