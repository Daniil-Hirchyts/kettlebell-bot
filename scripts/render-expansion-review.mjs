#!/usr/bin/env node
// Render real state-machine combinations at their actual intended sizes.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";
import { buildScene } from "./lib/scene.mjs";
import { blank, decodePng, drawText, encodePng, paste } from "./lib/png.mjs";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "previews/review");
mkdirSync(out, { recursive: true });
const examples = [
  { key: "calm", mood: 0 },
  { key: "happy", mood: 9 },
  { key: "determined", mood: 16 },
  { key: "exhausted", mood: 17 },
  { key: "recovering", mood: 18 },
  { key: "cheeky", mood: 19 },
  { key: "power", mood: 0, reaction: "powerUp" },
  { key: "record", mood: 0, reaction: "personalBest" },
  { key: "cheer", mood: 0, reaction: "cheer" },
  { key: "appreciate", mood: 0, reaction: "appreciate" },
  { key: "idea", mood: 0, reaction: "idea" },
  { key: "dizzy", mood: 0, reaction: "dizzy" },
];
const { meta } = buildScene();
const groups = { expansion: examples, accents: [
  ...meta.eyeExpressions.slice(7).map((e) => ({ key: e.key, mood: 0, eyes: e.value })),
  { key: "sparkles", mood: 9, eyes: 9, effect: "fxSparkles" },
  { key: "motes", mood: 0, eyes: 11, effect: "fxMotes" },
  { key: "sweat", mood: 17, eyes: 13, effect: "fxSweat" },
  { key: "dust", mood: 0, reaction: "personalBest", reactionTime: 0.95, effect: "fxDust" },
] };
const surfaces = [{ key: "light", background: "#F4F5F7", rgb: [244, 245, 247, 255], ink: [27, 29, 34, 255] },
  { key: "dark", background: "#0F1115", rgb: [15, 17, 21, 255], ink: [244, 245, 247, 255] }];
const client = new Client({ name: "kettlebell-review", version: "2.1.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));
try {
  for (const [group, samples] of Object.entries(groups)) for (const size of [44, 64, 160, 512]) for (const surface of surfaces) {
    const cell = Math.max(size, 84);
    const columns = size === 512 ? 3 : 6;
    const sheet = blank(columns * (cell + 12) + 12, 48 + Math.ceil(samples.length / columns) * (cell + 30), surface.rgb);
    drawText(sheet, `${surface.key} surface - ${size}px`, 12, 14, { scale: 2, color: surface.ink });
    for (let i = 0; i < samples.length; i++) {
      const e = samples[i];
      const steps = [
        { input: "status", value: e.mood, advance: 0.4 },
        ...(e.eyes ? [{ input: "eyes", value: e.eyes, advance: 0.2 }] : []),
        ...(e.reaction ? [{ input: e.reaction, advance: e.reactionTime ?? 0.5 }] : []),
        ...(e.effect ? [{ input: e.effect, advance: e.effect === "fxDust" ? 0.18 : 0.35, capture: true }] : [{ advance: e.reaction ? 0 : 0.4, capture: true }]),
      ];
      const result = await client.callTool({ name: "riv_play_state_machine", arguments: {
        path: resolve(root, "rive/kettlebell-bot.riv"), artboard: "KettlebellBot",
        stateMachine: "KettlebellBotMachine", width: size, background: surface.background, steps,
      } });
      const frame = result.content?.find((c) => c.type === "image");
      if (result.isError || !frame) throw new Error(`render failed: ${size}/${surface.key}/${e.key}`);
      const png = Buffer.from(frame.data, "base64");
      writeFileSync(resolve(out, `${group}-${surface.key}-${size}-${e.key}.png`), png);
      const x = 12 + i % columns * (cell + 12), y = 48 + Math.floor(i / columns) * (cell + 30);
      paste(sheet, decodePng(png), x + Math.floor((cell - size) / 2), y + Math.floor((cell - size) / 2));
      drawText(sheet, e.key, x, y + cell + 8, { scale: 1, color: surface.ink });
    }
    writeFileSync(resolve(root, `previews/sheets/${group}-${surface.key}-${size}.png`), encodePng(sheet));
    console.log(`${group}: ${surface.key} ${size}px: ${samples.length} samples rendered`);
  }
} finally { await client.close(); }
