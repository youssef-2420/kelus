#!/usr/bin/env node
const { readStdin } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const server = input.server || input.mcp_server || 'unknown';
    const tool = input.tool || input.mcp_tool || 'unknown';
    console.error(`[ECC] MCP invocation: ${server}/${tool}`);
    const trusted = /^(cursor(-[a-z0-9-]+)?|github|figma|mobbin)$/i;
    if (server && server !== 'unknown' && !trusted.test(String(server))) {
      console.error(`[ECC] WARNING: Untrusted MCP server: ${server}`);
      console.error('[ECC] Review the tool arguments before continuing');
    }
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
