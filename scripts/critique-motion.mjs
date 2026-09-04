#!/usr/bin/env node
//
// Visual critique pass: filmstrip + onion skin + motion report per animation.
//
//   node scripts/critique-motion.mjs <iteration-tag> [animation ...]
//
// Writes previews/critique/<tag>-<slug>-{filmstrip,onion}.png and a combined
// <tag>-report.md. Run it, look at the images, fix, run it again with a new tag.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";
import { stackStrips } from "./lib/stack.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const outDir = resolve(projectRoot, "previews/critique");
mkdirSync(outDir, { recursive: true });

const tag = process.argv[2] ?? "pass";
const explicit = process.argv.slice(3);

// The animations whose motion quality carries the whole system.
const DEFAULT_TARGETS = [
  "showcase_turnaround",
  "turn_spin_right",
  "turn_peek_back",
  "mood_00_calm",
  "mood_01_curious",
  "mood_02_thinking",
  "mood_03_working",
  "mood_04_bored",
  "mood_05_blocked",
  "mood_06_sleepy",
  "mood_08_excited",
  "mood_14_playful",
  "react_acknowledge",
  "react_surprise",
  "react_celebrate",
  "react_frustrated",
  "react_recoil",
  "showcase_emotions",
];

const targets = explicit.length ? explicit : DEFAULT_TARGETS;

const client = new Client({ name: "kettlebell-bot-critique", version: "2.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));

const reportLines = [`# Motion critique — ${tag}`, "", `Generated ${new Date().toISOString()}`, ""];

try {
  for (const animation of targets) {
    const result = await client.callTool({
      name: "riv_critique",
      arguments: {
        path: rivPath,
        artboard: "KettlebellBot",
        animation,
        frames: 10,
        width: 160,
        individualFrames: false,
      },
    });
    const text = result.content?.find((i) => i.type === "text")?.text ?? "";
    const images = result.content?.filter((i) => i.type === "image") ?? [];
    if (images[0]) writeFileSync(resolve(outDir, `${tag}-${animation}-filmstrip.png`), Buffer.from(images[0].data, "base64"));
    if (images[1]) writeFileSync(resolve(outDir, `${tag}-${animation}-onion.png`), Buffer.from(images[1].data, "base64"));
    const motion = text.split("METRICS")[0].trim();
    reportLines.push(`## ${animation}`, "", "```", motion, "```", "");
    console.log(`${animation.padEnd(24)} ${images.length} images`);
    if (result.isError) process.exitCode = 1;
  }
} finally {
  await client.close();
}

writeFileSync(resolve(outDir, `${tag}-report.md`), `${reportLines.join("\n")}\n`);

// Stack the filmstrips five at a time: reviewing one tall sheet catches
// cross-animation problems (everything settling the same way, two states that
// read alike) that looking at strips one by one does not.
const rendered = targets.filter((name) => existsSync(resolve(outDir, `${tag}-${name}-filmstrip.png`)));
for (let i = 0; i < rendered.length; i += 5) {
  const group = rendered.slice(i, i + 5);
  const sheet = resolve(outDir, `${tag}-contact-${String(i / 5 + 1).padStart(2, "0")}.png`);
  stackStrips(group.map((name) => [name, resolve(outDir, `${tag}-${name}-filmstrip.png`)]), sheet);
  console.log(`contact sheet: ${sheet}`);
}

console.log(`\ncritique written to ${outDir}`);
