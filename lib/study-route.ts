import type { RankedConcept } from "@/domain/scheduler";
import type { RouteStop } from "@/components/hero/route-data";

export function routeReason(row: RankedConcept) {
  const { concept, status } = row;
  if (concept.importance >= 0.85 && concept.mastery < 0.55) return "High exam value · Low mastery";
  if (status === "fading") return "Fading · Review now";
  if (status === "not_learned") return "Not learned yet";
  if (status === "weak") return "Needs retrieval";
  if (concept.importance >= 0.7) return "High exam relevance";
  return "Best remaining return";
}

function spendBudget(weights: number[], budget: number) {
  const sum = weights.reduce((total, value) => total + value, 0);
  const minutes = weights.map((value) => Math.max(5, Math.round((value / Math.max(sum, 1)) * budget)));
  let drift = minutes.reduce((total, value) => total + value, 0) - budget;
  let index = 0;
  while (drift !== 0 && index < minutes.length * 4) {
    const slot = index % minutes.length;
    if (drift > 0 && minutes[slot] > 5) {
      minutes[slot] -= 1;
      drift -= 1;
    } else if (drift < 0) {
      minutes[slot] += 1;
      drift += 1;
    }
    index += 1;
  }
  return minutes;
}

export function allocateStudyRoute(rows: RankedConcept[], totalMinutes: number): RouteStop[] {
  if (!rows.length) return [];
  const mix = totalMinutes >= 30 ? Math.min(5, Math.max(0, totalMinutes - rows.length * 5)) : 0;
  const budget = totalMinutes - mix;
  const minutes = spendBudget(rows.map((row) => Math.max(0.2, row.priority)), budget);
  const stops: RouteStop[] = rows.map((row, index) => ({
    id: row.concept.id,
    minutes: minutes[index],
    name: row.concept.name,
    reason: routeReason(row),
  }));
  if (mix) {
    stops.push({
      id: "mixed",
      minutes: mix,
      name: "Mixed retrieval",
      reason: "Quick checks across today’s topics",
    });
  }
  return stops;
}
