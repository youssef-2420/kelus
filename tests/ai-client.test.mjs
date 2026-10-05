import assert from "node:assert/strict";
import test from "node:test";
import { fetchAiTopicContent } from "../lib/ai-client.ts";
import { mergeAiContent, validateAiReply } from "../domain/ai-content.ts";

const input = {
  name: "Tax Incidence",
  locator: "Page 6",
  pageText: "Tax incidence describes how the burden of a tax is shared between buyers and sellers. The side of the market that is less elastic bears a larger share of the tax burden.",
  otherTopics: ["Total Revenue Test"],
};
const reply = JSON.stringify({
  explanation: "Tax incidence is about who really pays a tax.",
  items: [{ kind: "why", prompt: "Why does the less elastic side bear more?", modelAnswer: "Fewer alternatives.", sourceQuote: "The side of the market that is less elastic bears a larger share of the tax burden." }],
});
const fetchReturning = (status, body) => async () => new Response(JSON.stringify(body), { status });

test("without an endpoint nothing is sent", async () => {
  let called = false;
  const result = await fetchAiTopicContent(input, { endpoint: "", fetchImpl: async () => { called = true; return new Response("{}"); } });
  assert.equal(result, null);
  assert.equal(called, false);
});

test("a good reply becomes checked content", async () => {
  const result = await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: fetchReturning(200, { text: reply }) });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].origin, "ai");
});

test("any failure returns null so the offline questions are used", async () => {
  assert.equal(await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: fetchReturning(502, { error: "x" }) }), null);
  assert.equal(await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: async () => { throw new Error("offline"); } }), null);
  assert.equal(await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: fetchReturning(200, { text: "not json" }) }), null);
  assert.equal(await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: fetchReturning(200, { nope: 1 }) }), null);
});

test("a made-up quote from the model never reaches the learner", async () => {
  const forged = JSON.stringify({ explanation: "x", items: [{ kind: "recall", prompt: "Q", modelAnswer: "A", sourceQuote: "Demand always rises when prices fall." }] });
  assert.equal(await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: fetchReturning(200, { text: forged }) }), null);
});

test("what is sent is only the prompt built from the page", async () => {
  let sent;
  await fetchAiTopicContent(input, { endpoint: "https://proxy.example", fetchImpl: async (_url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ text: reply })); } });
  assert.deepEqual(Object.keys(sent).sort(), ["system", "user"]);
  const user = JSON.parse(sent.user);
  assert.equal(user.pageText, input.pageText);
  assert.ok(!JSON.stringify(sent).includes("kelus-ai"));
});

test("AI questions are put ahead of the offline ones, which stay as backup", () => {
  const content = validateAiReply(reply, input);
  const activity = { teach: { facts: ["f"], pageText: input.pageText }, practice: [{ id: "o1", kind: "cloze", origin: "offline" }, { id: "old-ai", kind: "why", origin: "ai" }] };
  const merged = mergeAiContent(activity, content);
  assert.equal(merged.practice[0].origin, "ai");
  assert.deepEqual(merged.practice.map((item) => item.id).slice(1), ["o1"]);
  assert.equal(merged.teach.aiExplanation, content.explanation);
  assert.equal(merged.teach.pageText, input.pageText);
  assert.equal(mergeAiContent(activity, null), activity);
});
