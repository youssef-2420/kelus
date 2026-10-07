import { allTopics } from "../tests/fixtures/question-corpus.mjs";
import { buildPractice } from "../domain/content-engine";
import { isDrillable } from "../domain/practice-check";

const only = process.argv[2]?.toLowerCase();
let total = 0;
for (const { course, name, text, siblings } of allTopics()) {
  if (only && !`${course} ${name}`.toLowerCase().includes(only)) continue;
  const items = buildPractice({ conceptId: name, name, excerpt: text, locator: "Section 1", siblingNames: siblings.filter((s) => s !== name) }).filter(isDrillable);
  total += items.length;
  console.log(`\n=== ${course.toUpperCase()} · ${name} (${items.length} drillable)`);
  for (const item of items) {
    const tag = item.variant === "truefalse" ? "tf" : item.kind;
    const opts = item.choices ? `\n       options: ${item.choices.map((c, i) => `${i === item.correctIndex ? "*" : ""}${c}`).join(" | ")}` : "";
    console.log(`  [${tag}] ${item.prompt}\n       answer: ${item.modelAnswer}${opts}`);
  }
}
console.log(`\ntotal drillable questions: ${total}`);
