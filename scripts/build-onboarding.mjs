#!/usr/bin/env node
//
// Build the onboarding hero loops: one independent .riv per hero.
//
//   node scripts/build-onboarding.mjs [--dry] [--only <substring>]
//
// Each file holds one portrait artboard, one looping timeline of the same name
// and an `Onboarding` state machine that plays it, so a runtime that autoplays
// the default state machine needs no configuration at all.

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateLoop } from "./lib/onboarding/kit.mjs";
import { HEROES } from "./lib/onboarding/index.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const outDir = resolve(projectRoot, "rive/onboarding");
mkdirSync(outDir, { recursive: true });

const dry = process.argv.includes("--dry");
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;

const heroes = HEROES.filter((h) => !only || h.NAME.includes(only));
const built = [];
let failed = false;
for (const hero of heroes) {
  const scene = hero.build();
  const { errors, warnings } = validateLoop(scene);
  for (const w of warnings) console.warn(`warn  ${hero.NAME}: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`error ${hero.NAME}: ${e}`);
    failed = true;
    continue;
  }
  const anim = scene.animations[0];
  const keyframes = anim.tracks.reduce((n, t) => n + t.keyframes.length, 0);
  console.log(
    `${hero.NAME}: ${(anim.duration / anim.fps).toFixed(2)} s · ${scene.groups.length} nodes · ${scene.shapes.length} shapes · ` +
      `${anim.tracks.length} tracks · ${keyframes} keyframes`,
  );
  writeFileSync(resolve(outDir, `${hero.NAME}.scene.json`), `${JSON.stringify(scene, null, 2)}\n`);
  built.push({ hero, scene });
}
if (failed) {
  console.error("\nscene errors; nothing written for the failing heroes.");
  process.exitCode = 1;
}
if (dry || !built.length) process.exit(process.exitCode ?? 0);

const { Client, StdioClientTransport } = await import("./rive-mcp-sdk.mjs");
const client = new Client({ name: "kettlebell-bot-onboarding", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));
try {
  for (const { hero, scene } of built) {
    const outPath = resolve(outDir, `${hero.NAME}.riv`);
    const result = await client.callTool({ name: "riv_create", arguments: { outPath, scene, previewTime: 0 } });
    const text = result.content?.find((c) => c.type === "text")?.text ?? "";
    if (result.isError) {
      console.error(`FAIL ${hero.NAME}\n${text.slice(0, 2000)}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`wrote ${outPath} (${Math.round(statSync(outPath).size / 1024)} KB)`);
  }
} finally {
  await client.close();
}
