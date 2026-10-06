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

test("flipOneWord swaps exactly one safe word, and refuses when a flip could still read as true", async () => {
  const { flipOneWord } = await import("../domain/content-engine.ts");
  assert.equal(flipOneWord("In a hypotonic solution a cell gains water and may burst."), null); // two swappable words (hypotonic, gains)
  assert.equal(flipOneWord("Close substitutes make demand more elastic because buyers can switch."), null); // two swappable words
  assert.equal(flipOneWord("Water moves toward the side with more solute because the solute lowers the water potential there."), "Water moves toward the side with less solute because the solute lowers the water potential there.");
  assert.equal(flipOneWord("Prices do not rise when supply increases a little."), null); // negation
  assert.equal(flipOneWord("Cells use energy to build proteins."), null); // nothing to flip
  assert.equal(flipOneWord("Higher prices reduce the quantity that buyers want."), "Lower prices reduce the quantity that buyers want."); // capital kept
});

test("true/false items: the page quote is always the real sentence, the false version is never the real one, and the answer is consistent", async () => {
  const { buildPractice, quoteIsOnPage } = await import("../domain/content-engine.ts");
  const excerpt = "Water moves toward the side with more solute because the solute lowers the water potential there. Higher prices reduce the quantity that buyers want from the market. Plant cells resist bursting because the cell wall pushes back, creating turgor pressure inside the cell.";
  const items = buildPractice({ conceptId: "tf1", name: "Osmosis", excerpt, locator: "Page 2", siblingNames: [] }).filter((item) => item.variant === "truefalse");
  assert.ok(items.length >= 1);
  const verdicts = new Set(items.map((item) => item.modelAnswer));
  for (const item of items) {
    assert.deepEqual(item.choices, ["True", "False"]);
    assert.equal(item.choices[item.correctIndex], item.modelAnswer);
    assert.ok(quoteIsOnPage(item.sourceQuote, excerpt));
    const shown = item.prompt.replace(/^[^“]*“/, "").replace(/”$/, "");
    if (item.modelAnswer === "True") assert.equal(shown, item.sourceQuote);
    else { assert.notEqual(shown, item.sourceQuote); assert.ok(!excerpt.includes(shown)); }
    assert.match(item.explanation, /^(True|False)\./);
  }
  if (items.length > 1) assert.equal(verdicts.size, 2); // one true, one false
});
