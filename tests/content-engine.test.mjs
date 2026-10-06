import assert from "node:assert/strict";
import test from "node:test";


test("gaps test the point of a sentence: a figure, acronym or term, never a verb, and never leak the answer", async () => {
  const { buildPractice } = await import("../domain/content-engine.ts");
  const excerpt = "Cellular respiration is the process by which cells convert glucose and oxygen into ATP. It occurs in three stages: glycolysis, the Krebs cycle and the electron transport chain. Glycolysis takes place in the cytoplasm and splits one glucose molecule into two pyruvate molecules, producing a net gain of 2 ATP. A student who spends an evening studying instead of working a shift for $60 has an opportunity cost of $60. It includes both explicit costs, such as money spent, and implicit costs, such as time.";
  const gaps = buildPractice({ conceptId: "r", name: "Cell respiration", excerpt, locator: "Page 3", siblingNames: [] }).filter((item) => item.kind === "cloze");
  assert.ok(gaps.length >= 2);
  for (const item of gaps) {
    assert.doesNotMatch(item.modelAnswer, /^(includes|studying|occurs|produces)$/i);
    const prompt = item.prompt.replace(/^[^“]*“/, "");
    assert.ok(!new RegExp(`(?<![\\w])${item.modelAnswer}(?![\\w])`, "i").test(prompt), `answer "${item.modelAnswer}" leaks in: ${prompt}`);
  }
  assert.ok(gaps.some((item) => /^(2|60|Krebs|ATP|cytoplasm|money)$/i.test(item.modelAnswer)));
});
