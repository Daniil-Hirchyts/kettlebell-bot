#!/usr/bin/env node
//
// Build the Kettlebell Bot .riv from the generated scene spec.
//
//   node scripts/build-rive.mjs [--dry]
//
// --dry validates and writes rive/kettlebell-bot.scene.json without invoking
// the Rive MCP server, which is handy while iterating on motion.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildScene } from "./lib/scene.mjs";
import { validateScene } from "./lib/validate.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const scenePath = resolve(projectRoot, "rive/kettlebell-bot.scene.json");
const outPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const dry = process.argv.includes("--dry");

const { scene, meta } = buildScene();
const { errors, warnings } = validateScene(scene, meta);

for (const warning of warnings) console.warn(`warn  ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`error ${error}`);
  console.error(`\n${errors.length} scene error(s); nothing written.`);
  process.exit(1);
}

writeFileSync(scenePath, `${JSON.stringify(scene, null, 2)}\n`);

const trackCount = scene.animations.reduce((sum, a) => sum + a.tracks.length, 0);
const keyframeCount = scene.animations.reduce(
  (sum, a) => sum + a.tracks.reduce((n, t) => n + t.keyframes.length, 0),
  0,
);
console.log(
  `scene: ${scene.groups.length} nodes · ${scene.shapes.length} shapes · ${scene.animations.length} animations · ` +
    `${trackCount} tracks · ${keyframeCount} keyframes · ${scene.stateMachine.inputs.length} inputs · ` +
    `${scene.stateMachine.layers.length} layers · ` +
    `${scene.stateMachine.layers.reduce((n, l) => n + l.transitions.length, 0)} transitions`,
);

if (dry) {
  console.log(`dry run — wrote ${scenePath}`);
  process.exit(0);
}

const { Client, StdioClientTransport } = await import("./rive-mcp-sdk.mjs");
const client = new Client({ name: "kettlebell-bot-builder", version: "2.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });
await client.connect(transport);

try {
  const result = await client.callTool({
    name: "riv_create",
    arguments: { outPath, scene, previewTime: 0 },
  });
  for (const item of result.content ?? []) {
    if (item.type === "text") process.stdout.write(`${item.text}\n`);
    if (item.type === "image") {
      writeFileSync(
        resolve(projectRoot, "previews/static/kettlebell-bot-512.png"),
        Buffer.from(item.data, "base64"),
      );
    }
  }
  if (result.isError) process.exitCode = 1;
} finally {
  await client.close();
}
