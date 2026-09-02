# Cursor hooks (Kelus)

Project hooks for Cursor Agent. Config lives in [`.cursor/hooks.json`](../hooks.json). Enable them in Cursor under **Settings → Hooks**, and trust this workspace.

Vendored from [everything-claude-code](https://github.com/affaan-m/everything-claude-code) (MIT; see `LICENSE`). Wrappers in this folder adapt Cursor stdin to the Claude-shaped scripts under `scripts/hooks/`.

## What they do

| Event | Behavior |
|---|---|
| `sessionStart` / `sessionEnd` | Load/persist session context under the ECC agent data home |
| `beforeShellExecution` | Block `git --no-verify` (flag-aware, not message-body matches); require tmux for `npm run dev` |
| `afterShellExecution` | Log PR URLs and completed builds |
| `afterFileEdit` | Accumulate JS/TS edits, warn on `console.log`, remind about frontend design quality |
| `stop` | Audit `console.log` in modified files; batch-format/typecheck accumulated edits |
| `beforeReadFile` | Warn when reading `.env`, `.key`, `.pem`, credentials |
| `beforeTabFileRead` | Block Tab from reading those secret files |
| `afterTabFileEdit` | Auto-format Tab edits when Prettier or Biome is configured |
| `beforeSubmitPrompt` | Warn on `sk-`, `ghp_`, `AKIA`, Slack, and PEM patterns in prompts |
| `beforeMCPExecution` / `afterMCPExecution` | Audit MCP calls; warn on untrusted servers |
| `subagentStart` / `subagentStop` | Log Task subagents |
| `preCompact` | Snapshot session state before context compaction |

## Disable or slim down

```bash
# Skip individual hooks (comma-separated ids, see adapter.js / wrappers)
ECC_DISABLED_HOOKS=stop:format-typecheck,post:edit:design-quality-check

# Profiles: minimal | standard (default) | strict
ECC_HOOK_PROFILE=minimal
```

This repo is `"type": "module"`. Each of `.cursor/hooks`, `scripts/hooks`, and `scripts/lib` has a local `package.json` with `"type": "commonjs"` so the vendored `require()` scripts still load.
