import { allTopics } from "../tests/fixtures/question-corpus.mjs";
import { buildPractice } from "../domain/content-engine";
import { isDrillable } from "../domain/practice-check";
import { lintQuestion } from "../domain/question-lint";

const rows = [...allTopics()].map(({ course, name, text, siblings }) => {
  const items = buildPractice({ conceptId: name, name, excerpt: text, locator: "Section 1", siblingNames: siblings.filter((s) => s !== name) }).filter(isDrillable);
  return { name, items };
});
const all = rows.flatMap((row) => row.items);
const kind = (item: (typeof all)[number]) => (item.variant === "truefalse" ? "true/false" : item.kind === "choice" ? (item.prompt.startsWith("Which idea") ? "which-idea" : item.prompt.startsWith("In your notes") ? "sequence" : item.prompt.startsWith("Which one matches") ? "match" : "choice-other") : item.kind);
const mix: Record<string, number> = {};
for (const item of all) mix[kind(item)] = (mix[kind(item)] ?? 0) + 1;
const defects: Record<string, number> = {};
let defective = 0;
for (const item of all) { const d = lintQuestion(item); if (d.length) defective += 1; for (const x of d) defects[x] = (defects[x] ?? 0) + 1; }
const understand = all.filter((item) => item.level === "understand").length;
console.log(`topics: ${rows.length} | questions: ${all.length} (${(all.length / rows.length).toFixed(1)} per topic)`);
console.log(`topics with >=3 drillable (a full quick run): ${rows.filter((r) => r.items.length >= 3).length} | >=2 (a short run): ${rows.filter((r) => r.items.length >= 2).length} | <2 (no quick run): ${rows.filter((r) => r.items.length < 2).map((r) => r.name).join(", ") || "none"}`);
console.log(`mix: ${Object.entries(mix).map(([k, v]) => `${k} ${v} (${Math.round((100 * v) / all.length)}%)`).join(" · ")}`);
console.log(`understanding-level questions (why / predict / compare): ${understand} (${Math.round((100 * understand) / all.length)}%)`);
console.log(`questions with a defect: ${defective} (${Math.round((100 * defective) / all.length)}%) ${JSON.stringify(defects)}`);
