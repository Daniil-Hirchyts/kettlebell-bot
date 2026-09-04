#!/usr/bin/env node

import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";

const [action = "list", toolName, rawArgs = "{}"] = process.argv.slice(2);
const client = new Client({ name: "kettlebell-bot-builder", version: "1.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });

await client.connect(transport);

try {
  if (action === "list") {
    const result = await client.listTools();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (action === "call") {
    if (!toolName) throw new Error("Usage: rive-mcp-client.mjs call <tool> '<json-args>'");
    const result = await client.callTool({ name: toolName, arguments: JSON.parse(rawArgs) });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
} finally {
  await client.close();
}
