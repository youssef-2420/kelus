import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const root = process.cwd();
const hooksJson = JSON.parse(readFileSync(join(root, ".cursor/hooks.json"), "utf8"));

function runHook(script, input, extraEnv = {}) {
  return spawnSync("node", [script], {
    cwd: root,
    encoding: "utf8",
    input: typeof input === "string" ? input : JSON.stringify(input),
    timeout: 20_000,
    env: {
      ...process.env,
      ECC_HOOK_PROFILE: "standard",
      ...extraEnv,
    },
  });
}

test("hooks.json registers every Cursor event from the pasted kit", () => {
  assert.equal(hooksJson.version, 1);
  const expected = [
    "sessionStart",
    "sessionEnd",
    "beforeShellExecution",
    "afterShellExecution",
    "afterFileEdit",
    "beforeMCPExecution",
    "afterMCPExecution",
    "beforeReadFile",
    "beforeSubmitPrompt",
    "subagentStart",
    "subagentStop",
    "beforeTabFileRead",
    "afterTabFileEdit",
    "preCompact",
    "stop",
  ];
  assert.deepEqual(Object.keys(hooksJson.hooks), expected);
});

test("every hooks.json command points at an existing script", () => {
  for (const entries of Object.values(hooksJson.hooks)) {
    for (const entry of entries) {
      const match = String(entry.command).match(/^node\s+(\S+)/);
      assert.ok(match, `expected node command: ${entry.command}`);
      assert.equal(readFileSync(join(root, match[1]), "utf8").length > 0, true);
    }
  }
});

test("lightweight wrappers fail-open on empty JSON", () => {
  for (const script of [
    ".cursor/hooks/after-shell-execution.js",
    ".cursor/hooks/after-mcp-execution.js",
    ".cursor/hooks/before-read-file.js",
    ".cursor/hooks/before-submit-prompt.js",
    ".cursor/hooks/subagent-start.js",
    ".cursor/hooks/subagent-stop.js",
    ".cursor/hooks/before-tab-file-read.js",
  ]) {
    const result = runHook(script, {});
    assert.equal(result.status, 0, `${script} should exit 0`);
  }
});

test("block-no-verify denies git hook bypass flags and allows message-body mentions", () => {
  const { run } = require("../scripts/hooks/block-no-verify.js");

  const deny = run(JSON.stringify({ tool_input: { command: "git commit --no-verify -m 'wip'" } }));
  assert.equal(deny.exitCode, 2);

  const denyPush = run(JSON.stringify({ tool_input: { command: "git push --no-verify origin main" } }));
  assert.equal(denyPush.exitCode, 2);

  const allowMessage = run(JSON.stringify({
    tool_input: { command: "git commit -m 'docs: mention --no-verify in the guide'" },
  }));
  assert.equal(allowMessage.exitCode ?? 0, 0);

  const allowStatus = run(JSON.stringify({ tool_input: { command: "git status" } }));
  assert.equal(allowStatus.exitCode ?? 0, 0);
});

test("beforeShellExecution blocks a detached npm run dev outside tmux", () => {
  const blocked = runHook(".cursor/hooks/before-shell-execution.js", {
    command: "npm run dev",
    hook_event_name: "beforeShellExecution",
  });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /Dev server must run in tmux/);

  const allowed = runHook(".cursor/hooks/before-shell-execution.js", {
    command: 'tmux new-session -d -s dev "npm run dev"',
    hook_event_name: "beforeShellExecution",
  });
  assert.equal(allowed.status, 0);
});

test("Tab cannot read secret files and agent reads only warn", () => {
  const tab = runHook(".cursor/hooks/before-tab-file-read.js", { path: ".env.local" });
  assert.equal(tab.status, 2);
  assert.match(tab.stderr, /BLOCKED/);

  const read = runHook(".cursor/hooks/before-read-file.js", { path: ".env.local" });
  assert.equal(read.status, 0);
  assert.match(read.stderr, /WARNING: Reading sensitive file/);
});

test("beforeSubmitPrompt warns on known secret patterns", () => {
  const result = runHook(".cursor/hooks/before-submit-prompt.js", {
    prompt: "deploy with sk-abcdefghijklmnopqrstuvwxyz012345 and ghp_abcdefghijklmnopqrstuvwxyz0123456789",
  });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Potential secret detected/);
});

test("beforeMCPExecution warns on untrusted servers and stays quiet for Cursor builtins", () => {
  const untrusted = runHook(".cursor/hooks/before-mcp-execution.js", {
    server: "random-remote-tools",
    tool: "exec",
  });
  assert.equal(untrusted.status, 0);
  assert.match(untrusted.stderr, /Untrusted MCP server/);

  const trusted = runHook(".cursor/hooks/before-mcp-execution.js", {
    server: "cursor-cloud",
    tool: "run-info",
  });
  assert.equal(trusted.status, 0);
  assert.doesNotMatch(trusted.stderr, /Untrusted MCP server/);
});
