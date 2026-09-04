#!/usr/bin/env node
//
// Render a transparent APNG for every animation in the system, plus the static
// size/surface checks.
//
//   node scripts/render-previews.mjs [--only <substring>]
//
// Output:
//   previews/animations/<name>.apng   one per animation (moods, reactions,
//                                     blinks, head turns, spins, showcases)
//   previews/static/                  512/256/128/64 px and light/dark surfaces

import { mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";
import { buildScene } from "./lib/scene.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const animationDir = resolve(projectRoot, "previews/animations");
const strayGif = resolve(projectRoot, "rive/kettlebell-bot.preview.gif");
const staticDir = resolve(projectRoot, "previews/static");
mkdirSync(animationDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;

const { meta } = buildScene();

const clips = [
  ...meta.moods.map((m) => m.anim),
  ...meta.reactions.map((r) => r.anim),
  ...meta.blinks.map((b) => b.anim),
  ...meta.yawLoops.map((y) => y.anim),
  ...meta.turnShots.map((t) => t.anim),
  meta.touch.hover,
  meta.touch.press,
  meta.energy[0].anim,
  meta.energy[2].anim,
  meta.showcaseTurn,
  meta.showcaseEmotions,
]
  .map((anim) => {
    const seconds = anim.duration / 60;
    const showcase = anim.name.startsWith("showcase_") || anim.name === "turn_showcase_360";
    // Transparent APNG does not compress gradients well, so the frame rate and
    // size are traded against duration: short one-shots keep their snap, long
    // ambient loops drop frames the eye does not miss, and the three hero reels
    // stay large because they are the ones people actually watch.
    const fps = showcase ? 20 : seconds > 4 ? 14 : seconds > 2 ? 18 : 24;
    const size = showcase ? 240 : 180;
    return { name: anim.name, duration: Number(seconds.toFixed(3)), fps, size, showcase };
  })
  .filter((c) => !only || c.name.includes(only));

const client = new Client({ name: "kettlebell-bot-renderer", version: "2.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));

let failures = 0;
try {
  for (const clip of clips) {
    // The long reels ship as GIF: transparent APNG of a 10-13 second gradient
    // character is several megabytes, and these are the files people open.
    const result = clip.showcase
      ? await client.callTool({
          name: "riv_render_gif",
          arguments: {
            path: rivPath,
            artboard: "KettlebellBot",
            animation: clip.name,
            duration: clip.duration,
            fps: clip.fps,
            width: clip.size,
            height: clip.size,
            background: "#F4F5F7",
          },
        })
      : await client.callTool({
          name: "riv_render_apng",
          arguments: {
            path: rivPath,
            artboard: "KettlebellBot",
            animation: clip.name,
            duration: clip.duration,
            fps: clip.fps,
            width: clip.size,
            height: clip.size,
            transparent: true,
            loops: 0,
            out: resolve(animationDir, `${clip.name}.apng`),
          },
        });
    if (result.isError) {
      failures += 1;
      console.error(`FAIL ${clip.name}`);
      continue;
    }
    if (clip.showcase) {
      // riv_render_gif ignores `out` and writes <riv>.preview.gif; move it.
      renameSync(strayGif, resolve(animationDir, `${clip.name}.gif`));
    }
    console.log(`${clip.name.padEnd(24)} ${clip.duration}s @ ${clip.fps}fps ${clip.size}px${clip.showcase ? " gif" : ""}`);
  }

  if (!only) {
    for (const size of [512, 256, 128, 64]) {
      const result = await client.callTool({
        name: "riv_render_frame",
        arguments: {
          path: rivPath,
          artboard: "KettlebellBot",
          animation: "face_000",
          time: 0,
          width: size,
          height: size,
          outPath: resolve(staticDir, `kettlebell-bot-${size}.png`),
        },
      });
      if (result.isError) failures += 1;
    }

    for (const [name, background] of [
      ["light", "#F4F5F7"],
      ["dark", "#0F1115"],
    ]) {
      const result = await client.callTool({
        name: "riv_render_frame",
        arguments: {
          path: rivPath,
          artboard: "KettlebellBot",
          animation: "face_000",
          time: 0,
          width: 256,
          height: 256,
          background,
          outPath: resolve(staticDir, `kettlebell-bot-on-${name}.png`),
        },
      });
      if (result.isError) failures += 1;
    }
  }
} finally {
  await client.close();
}

console.log(`\n${clips.length} animation previews written to ${animationDir}`);
if (failures) {
  console.error(`${failures} render failure(s)`);
  process.exitCode = 1;
}
