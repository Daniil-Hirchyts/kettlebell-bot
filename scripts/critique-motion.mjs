#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const outDir = resolve(projectRoot, "previews/comparisons");
mkdirSync(outDir, { recursive: true });

const targets = [
  ["idle", "01_idle"],
  ["thinking", "03_thinking"],
  ["working", "04_working"],
  ["waiting", "05_waiting"],
  ["blocked", "06_blocked_enter"],
  ["done", "08_done"],
];

const client = new Client({ name: "kettlebell-bot-critique", version: "1.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });
await client.connect(transport);

try {
  for (const [slug, animation] of targets) {
    const result = await client.callTool({
      name: "riv_critique",
      arguments: {
        path: rivPath,
        artboard: "KettlebellBot",
        animation,
        frames: 7,
        width: 150,
        individualFrames: false,
      },
    });
    const report = result.content?.find((item) => item.type === "text")?.text ?? "";
    const images = result.content?.filter((item) => item.type === "image") ?? [];
    writeFileSync(resolve(outDir, `motion-v3-${slug}-report.txt`), `${report}\n`);
    if (images[0]) writeFileSync(resolve(outDir, `motion-v3-${slug}-filmstrip.png`), Buffer.from(images[0].data, "base64"));
    if (images[1]) writeFileSync(resolve(outDir, `motion-v3-${slug}-onion.png`), Buffer.from(images[1].data, "base64"));
    console.log(`${animation}: ${images.length} critique images`);
    if (result.isError) process.exitCode = 1;
  }
} finally {
  await client.close();
}
