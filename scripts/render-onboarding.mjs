#!/usr/bin/env node
//
// Review and preview renders for the onboarding heroes.
//
//   node scripts/render-onboarding.mjs [--review] [--only <substring>]
//
// For every hero, from the built .riv:
//   previews/onboarding/<name>-contact.png  one loop as a labelled contact sheet
//   previews/onboarding/<name>-seam.png     the last half second and the first,
//                                            side by side across the loop point
//   previews/onboarding/<name>.gif          light-surface preview (skipped by --review)
//   previews/onboarding/<name>.apng         transparent preview (skipped by --review)
// and a seam report: two loops are rendered back to back, the frame-to-frame
// change is measured across both, and the step across the loop point has to
// look like any other step. A seam you can see is a spike in that series.

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";
import { HEROES } from "./lib/onboarding/index.mjs";
import { blank, decodePng, drawText, encodePng, paste } from "./lib/png.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivDir = resolve(projectRoot, "rive/onboarding");
const outDir = resolve(projectRoot, "previews/onboarding");
const scratch = resolve(outDir, ".tmp");
mkdirSync(scratch, { recursive: true });

const review = process.argv.includes("--review");
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
const SURFACE = "#F4F5F7";

const client = new Client({ name: "kettlebell-bot-onboarding-render", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${result.content?.[0]?.text?.slice(0, 800)}`);
  return result;
}

/** Render N evenly spaced frames over `seconds` and slice the grid. */
async function frames(path, artboard, { count, seconds, width, height }) {
  const out = resolve(scratch, `${artboard}-${count}-${width}.png`);
  await call("riv_render_sprites", { path, artboard, animation: artboard, count, duration: seconds, width, height, background: SURFACE, out });
  const sheet = decodePng(readFileSync(out));
  const meta = JSON.parse(readFileSync(out.replace(/\.png$/, ".json"), "utf8"));
  const cells = [];
  for (let i = 0; i < count; i += 1) {
    const cell = blank(meta.cellW, meta.cellH, [0, 0, 0, 0]);
    const ox = (i % meta.cols) * meta.cellW;
    const oy = Math.floor(i / meta.cols) * meta.cellH;
    for (let y = 0; y < meta.cellH; y += 1) {
      sheet.data.copy(cell.data, y * meta.cellW * 4, ((oy + y) * sheet.width + ox) * 4, ((oy + y) * sheet.width + ox + meta.cellW) * 4);
    }
    cells.push(cell);
  }
  return cells;
}

function meanDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return sum / (a.data.length * 0.75);
}

function grid(cells, cols, labels, { gap = 8, label = 18 } = {}) {
  const w = cells[0].width;
  const h = cells[0].height;
  const rows = Math.ceil(cells.length / cols);
  const sheet = blank(cols * (w + gap) + gap, rows * (h + gap + label) + gap, [226, 229, 234, 255]);
  cells.forEach((cell, i) => {
    const x = gap + (i % cols) * (w + gap);
    const y = gap + Math.floor(i / cols) * (h + gap + label);
    drawText(sheet, labels[i], x + 2, y + 3, { scale: 2, color: [70, 74, 84, 255] });
    paste(sheet, cell, x, y + label);
  });
  return sheet;
}

const summary = [];
try {
  for (const hero of HEROES.filter((h) => !only || h.NAME.includes(only))) {
    const name = hero.NAME;
    const path = resolve(rivDir, `${name}.riv`);
    const scene = JSON.parse(readFileSync(resolve(rivDir, `${name}.scene.json`), "utf8"));
    const anim = scene.animations[0];
    const seconds = anim.duration / anim.fps;

    // --- contact sheet: one loop -------------------------------------------
    const count = 30;
    const contact = await frames(path, name, { count, seconds, width: 216, height: 288 });
    const labels = contact.map((_, i) => `${((seconds * i) / count).toFixed(2)}S`);
    writeFileSync(resolve(outDir, `${name}-contact.png`), encodePng(grid(contact, 6, labels)));

    // --- seam report: two loops back to back ---------------------------------
    // Sample on whole animation frames so frame k of the second loop is exactly
    // frame k of the first; two loops have to fit the renderer's 256 cells.
    let step = 3;
    while (anim.duration % step !== 0 || anim.duration / step > 128) step += 1;
    const perLoop = anim.duration / step;
    const loops = 2;
    const series = await frames(path, name, { count: perLoop * loops, seconds: (perLoop * loops * step) / anim.fps, width: 180, height: 240 });
    const steps = [];
    for (let i = 1; i < series.length; i += 1) steps.push(meanDiff(series[i - 1], series[i]));
    const seamIndex = perLoop - 1; // step from the last frame of loop 1 into loop 2
    const sorted = [...steps].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const max = sorted.at(-1);
    // Frame k of loop 2 must match frame k of loop 1. A sample that lands exactly
    // on an eye-shape switch can resolve either side of it by float rounding, so
    // those frames are left out.
    const switches = new Set(anim.tracks.filter((t) => t.property === "soloActive").flatMap((t) => t.keyframes.map((k) => k.frame)));
    let repeat = 0;
    for (let i = 0; i + perLoop < series.length; i += 1) {
      if (switches.has((i % perLoop) * step)) continue;
      repeat = Math.max(repeat, meanDiff(series[i], series[i + perLoop]));
    }
    const seam = steps[seamIndex];
    const neighbours = [steps[seamIndex - 2], steps[seamIndex - 1], steps[seamIndex + 1], steps[seamIndex + 2]];
    const ok = seam <= Math.max(p90, 2 * Math.max(...neighbours), 0.05) && repeat < 0.05;
    summary.push({ name, seconds, seam, neighbours, p90, max, repeat, ok, steps });
    console.log(
      `${name}: seam step ${seam.toFixed(3)} (neighbours ${neighbours.map((n) => n.toFixed(3)).join(" ")}, ` +
        `p90 ${p90.toFixed(3)}, max ${max.toFixed(3)}) · loop repeat drift ${repeat.toFixed(4)} · ${ok ? "OK" : "SEAM VISIBLE"}`,
    );

    // --- seam strip: last half second, then the first -----------------------
    const around = [];
    const aroundLabels = [];
    for (let k = -5; k <= 4; k += 1) {
      const t = (((k / 10) % seconds) + seconds) % seconds;
      const out = resolve(scratch, `${name}-seam-${k}.png`);
      await call("riv_render_frame", { path, artboard: name, animation: name, time: t, width: 180, height: 240, background: SURFACE, outPath: out });
      around.push(decodePng(readFileSync(out)));
      aroundLabels.push(k < 0 ? `END${(k / 10).toFixed(1)}` : `START+${(k / 10).toFixed(1)}`);
    }
    writeFileSync(resolve(outDir, `${name}-seam.png`), encodePng(grid(around, 10, aroundLabels)));

    if (!review) {
      const gifPath = resolve(rivDir, `${name}.preview.gif`);
      await call("riv_render_gif", { path, artboard: name, animation: name, duration: seconds, fps: 24, width: 360, background: SURFACE, outPath: gifPath });
      renameSync(gifPath, resolve(outDir, `${name}.gif`));
      // Transparent APNG is kept small: it proves the alpha, the GIF is for watching.
      await call("riv_render_apng", { path, artboard: name, animation: name, duration: seconds, fps: 15, width: 240, height: 320, transparent: true, loops: 0, out: resolve(outDir, `${name}.apng`) });
    }
  }
} finally {
  await client.close();
  rmSync(scratch, { recursive: true, force: true });
}

// Merge by hero, so an --only run refreshes its own rows and keeps the rest.
const reportPath = resolve(outDir, "seam-report.json");
const previous = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : [];
const rows = new Map(previous.map((row) => [row.name, row]));
for (const { steps, ...row } of summary) rows.set(row.name, row);
const order = HEROES.map((h) => h.NAME);
writeFileSync(reportPath, `${JSON.stringify([...rows.values()].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)), null, 2)}\n`);
if (summary.some((s) => !s.ok)) process.exitCode = 1;
