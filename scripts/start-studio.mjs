#!/usr/bin/env node

import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const client = new Client({ name: "kettlebell-bot-studio", version: "1.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });

await client.connect(transport);
const result = await client.callTool({
  name: "riv_studio",
  arguments: {
    path: resolve(projectRoot, "rive/kettlebell-bot.riv"),
    scenePath: resolve(projectRoot, "rive/kettlebell-bot.scene.json"),
    port: 8787,
  },
});

for (const item of result.content ?? []) {
  if (item.type === "text") process.stdout.write(`${item.text}\n`);
}

const shutdown = async () => {
  await client.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
setInterval(() => {}, 60_000);
