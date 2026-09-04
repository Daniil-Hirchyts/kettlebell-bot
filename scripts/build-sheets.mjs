#!/usr/bin/env node
//
// Contact sheets: the reviewable, at-a-glance deliverables.
//
//   node scripts/build-sheets.mjs
//
// Writes previews/sheets/{turnaround,emotions,reactions,interaction,eye-shapes}.png
// Depends on previews/states/*.png from scripts/test-state-machine.mjs.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";
import { blank, decodePng, drawText, encodePng, fillRect, paste, textWidth } from "./lib/png.mjs";
import { buildScene } from "./lib/scene.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const statesDir = resolve(projectRoot, "previews/states");
const sheetDir = resolve(projectRoot, "previews/sheets");
mkdirSync(sheetDir, { recursive: true });

const BG = [244, 245, 247, 255];
const INK = [27, 29, 34, 255];
const MUTED = [124, 130, 142, 255];

function grid(cells, { columns, cell, title, gap = 10, label = 26 }) {
  const rows = Math.ceil(cells.length / columns);
  const top = 46;
  const sheet = blank(
    columns * cell + (columns + 1) * gap,
    top + rows * (cell + label) + (rows + 1) * gap,
    BG,
  );
  drawText(sheet, title, gap, 16, { scale: 3, color: INK });
  cells.forEach((entry, i) => {
    const cx = gap + (i % columns) * (cell + gap);
    const cy = top + gap + Math.floor(i / columns) * (cell + label + gap);
    fillRect(sheet, cx, cy, cell, cell, [255, 255, 255, 255]);
    if (entry.image) paste(sheet, entry.image, cx + Math.round((cell - entry.image.width) / 2), cy + Math.round((cell - entry.image.height) / 2));
    const text = entry.label.toUpperCase();
    const scale = textWidth(text, 2) <= cell ? 2 : 1;
    drawText(sheet, text, cx + Math.max(0, Math.round((cell - textWidth(text, scale)) / 2)), cy + cell + 8, { scale, color: MUTED });
  });
  return sheet;
}

function loadCaptures(prefix) {
  return readdirSync(statesDir)
    .filter((f) => f.startsWith(`${prefix}-`) && f.endsWith(".png"))
    .sort()
    .map((f) => ({
      file: f,
      label: f.replace(/^[a-z]+-\d+-/, "").replace(/\.png$/, ""),
      image: decodePng(readFileSync(resolve(statesDir, f))),
    }));
}

const { meta } = buildScene();
const client = new Client({ name: "kettlebell-bot-sheets", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));

const renderAnimationFrame = async (animation, time, size) => {
  const result = await client.callTool({
    name: "riv_render_frame",
    arguments: {
      path: rivPath,
      artboard: "KettlebellBot",
      animation,
      time,
      width: size,
      height: size,
      background: "#FFFFFF",
      outPath: resolve(sheetDir, ".tmp-frame.png"),
    },
  });
  const image = result.content?.find((i) => i.type === "image");
  if (!image) throw new Error(`render failed for ${animation}`);
  return decodePng(Buffer.from(image.data, "base64"));
};

try {
  // 1 · turnaround — every facing pose the blend state interpolates between
  const facingCells = [];
  for (const pose of meta.facingPoses) {
    facingCells.push({ label: `${pose.deg} deg`, image: await renderAnimationFrame(pose.anim.name, 0, 200) });
  }
  writeFileSync(
    resolve(sheetDir, "turnaround.png"),
    encodePng(grid(facingCells, { columns: 7, cell: 200, title: "Turnaround - facing 0 to 360" })),
  );

  // 2 · emotions — sampled from the live state machine, one cell per status
  const moodCells = loadCaptures("moods").map((c) => ({ ...c, label: c.label.replace(/^status-\d+-/, "").replace("boot-", "") }));
  writeFileSync(
    resolve(sheetDir, "emotions.png"),
    encodePng(grid(moodCells, { columns: 6, cell: 240, title: "Emotional states - status 0 to 15" })),
  );

  // 3 · reactions
  const reactionCells = loadCaptures("reactions").map((c) => ({ ...c, label: c.label.replace("trigger-", "") }));
  writeFileSync(
    resolve(sheetDir, "reactions.png"),
    encodePng(grid(reactionCells, { columns: 5, cell: 240, title: "One-shot reactions" })),
  );

  // 4 · interaction — gaze, intensity, hover/press, blinks
  const interactionCells = loadCaptures("interaction");
  writeFileSync(
    resolve(sheetDir, "interaction.png"),
    encodePng(grid(interactionCells, { columns: 6, cell: 240, title: "Gaze, intensity, touch and blinks" })),
  );

  // 5 · eye shapes — the solo variants that carry the emotional range
  const eyeCells = [];
  for (const [key, animation, time] of [
    ["pill", "mood_00_calm", 0],
    ["tall", "mood_08_excited", 0.02],
    ["round", "mood_01_curious", 0.02],
    ["slit", "mood_04_bored", 0.02],
    ["arc", "mood_09_happy", 0.02],
    ["wedge", "mood_07_focused", 0.02],
    ["star", "react_celebrate", 0.55],
  ]) {
    eyeCells.push({ label: key, image: await renderAnimationFrame(animation, time, 200) });
  }
  writeFileSync(
    resolve(sheetDir, "eye-shapes.png"),
    encodePng(grid(eyeCells, { columns: 7, cell: 200, title: "Eye shape variants (solo swap)" })),
  );
} finally {
  await client.close();
  rmSync(resolve(sheetDir, ".tmp-frame.png"), { force: true });
}

console.log(`sheets written to ${sheetDir}`);
