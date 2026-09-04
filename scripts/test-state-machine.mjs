#!/usr/bin/env node
//
// Drive every state-machine input and every transition, capture a frame per
// checkpoint, and fail loudly if an expected state change never happened.
//
//   node scripts/test-state-machine.mjs [passName ...]
//
// riv_play_state_machine accepts at most 50 steps per call, so the coverage is
// split into named passes that each start from a fresh machine.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";
import { buildScene } from "./lib/scene.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const captureDir = resolve(projectRoot, "previews/states");
mkdirSync(captureDir, { recursive: true });

const { meta } = buildScene();

const step = (label, patch) => ({ label, ...patch });

const passes = {
  // Every persistent status, in order, plus the return to calm.
  moods: [
    step("boot-calm", { advance: 0.3, capture: true }),
    ...meta.moods
      .filter((m) => m.status !== 0)
      .map((m) => step(`status-${m.status}-${m.key}`, { input: "status", value: m.status, advance: 0.55, capture: true })),
    step("status-0-calm-return", { input: "status", value: 0, advance: 0.5, capture: true }),
  ],
  // Every one-shot reaction, fired from a different mood each time so the
  // Reaction layer is proven to override whatever is playing underneath.
  reactions: [
    step("reaction-base", { advance: 0.2 }),
    ...meta.reactions.flatMap((r, i) => [
      step(`mood-under-${i}`, { input: "status", value: [0, 3, 8, 5, 6, 12, 7, 14, 1, 9][i] ?? 0, advance: 0.25 }),
      step(`trigger-${r.trigger}`, { input: r.trigger, advance: 0.28, capture: true }),
      step(`settle-${r.trigger}`, { advance: (r.anim.duration / 60) + 0.3 }),
    ]),
  ],
  // Turn layer: the facing blend across a full circle, then the four turn shots.
  turn: [
    step("facing-base", { advance: 0.2, capture: true }),
    ...[45, 90, 135, 180, 225, 270, 315, 360].map((deg) =>
      step(`facing-${deg}`, { input: "facing", value: deg, advance: 0.18, capture: true }),
    ),
    step("facing-reset", { input: "facing", value: 0, advance: 0.3 }),
    ...meta.turnShots.flatMap((t) => [
      step(`trigger-${t.trigger}`, { input: t.trigger, advance: 0.45, capture: true }),
      step(`settle-${t.trigger}`, { advance: (t.anim.duration / 60) + 0.4 }),
    ]),
    step("yaw-mood-curious", { input: "status", value: 1, advance: 0.7, capture: true }),
    step("yaw-mood-thinking", { input: "status", value: 2, advance: 0.7, capture: true }),
    step("yaw-mood-working", { input: "status", value: 3, advance: 0.5, capture: true }),
    step("yaw-mood-bored", { input: "status", value: 4, advance: 0.8, capture: true }),
    step("yaw-mood-confused", { input: "status", value: 11, advance: 0.6, capture: true }),
    step("yaw-mood-playful", { input: "status", value: 14, advance: 0.5, capture: true }),
    step("yaw-back-to-facing", { input: "status", value: 0, advance: 0.5, capture: true }),
  ],
  // Gaze, intensity, hover/press and the three blinks.
  interaction: [
    step("interaction-base", { advance: 0.2, capture: true }),
    step("gaze-left", { input: "gazeX", value: -1, advance: 0.2, capture: true }),
    step("gaze-right", { input: "gazeX", value: 1, advance: 0.2, capture: true }),
    step("gaze-up", { input: "gazeY", value: -1, advance: 0.2, capture: true }),
    step("gaze-down", { input: "gazeY", value: 1, advance: 0.2, capture: true }),
    step("gaze-diagonal", { input: "gazeX", value: -0.7, advance: 0.15, capture: true }),
    step("gaze-reset-x", { input: "gazeX", value: 0, advance: 0.1 }),
    step("gaze-reset-y", { input: "gazeY", value: 0, advance: 0.2 }),
    step("intensity-low", { input: "intensity", value: 0, advance: 0.4, capture: true }),
    step("intensity-high", { input: "intensity", value: 1, advance: 0.4, capture: true }),
    step("intensity-mid", { input: "intensity", value: 0.5, advance: 0.3 }),
    step("hover-on", { input: "hover", value: true, advance: 0.35, capture: true }),
    step("press-on", { input: "pressed", value: true, advance: 0.2, capture: true }),
    step("press-off", { input: "pressed", value: false, advance: 0.3, capture: true }),
    step("hover-off", { input: "hover", value: false, advance: 0.35, capture: true }),
    step("blink", { input: "blink", advance: 0.07, capture: true }),
    step("blink-settle", { advance: 0.3 }),
    step("blink-double", { input: "blinkDouble", advance: 0.1, capture: true }),
    step("blink-double-settle", { advance: 0.5 }),
    step("wink", { input: "wink", advance: 0.16, capture: true }),
    step("wink-settle", { advance: 0.4 }),
    step("tapped-touch", { input: "tapped", advance: 0.12, capture: true }),
  ],
};

// What each pass must actually have entered, by animation name.
const expected = {
  moods: meta.moods.map((m) => m.anim.name),
  reactions: meta.reactions.map((r) => r.anim.name),
  turn: [...meta.turnShots.map((t) => t.anim.name), ...meta.yawLoops.map((y) => y.anim.name)],
  interaction: [...meta.blinks.map((b) => b.anim.name), "touch_hover", "touch_press", "touch_rest"],
};

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(passes);

const client = new Client({ name: "kettlebell-bot-state-test", version: "2.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));

const summary = [];
let failed = false;

try {
  for (const name of names) {
    const pass = passes[name];
    if (!pass) throw new Error(`unknown pass: ${name}`);
    if (pass.length > 50) throw new Error(`pass ${name} has ${pass.length} steps (max 50)`);

    const result = await client.callTool({
      name: "riv_play_state_machine",
      arguments: {
        path: rivPath,
        stateMachine: "KettlebellBotMachine",
        artboard: "KettlebellBot",
        width: 240,
        background: "#F4F5F7",
        steps: pass.map(({ label, ...s }) => s),
      },
    });

    const text = result.content?.find((i) => i.type === "text");
    const report = text ? JSON.parse(text.text) : { report: [] };
    const seen = new Set();
    for (const entry of report.report ?? []) for (const s of entry.statesChanged ?? []) seen.add(s);

    const captured = pass.filter((s) => s.capture).map((s) => s.label);
    let index = 0;
    for (const item of result.content ?? []) {
      if (item.type !== "image") continue;
      const label = captured[index] ?? `capture-${index}`;
      writeFileSync(
        resolve(captureDir, `${name}-${String(index + 1).padStart(2, "0")}-${label}.png`),
        Buffer.from(item.data, "base64"),
      );
      index += 1;
    }

    const missing = (expected[name] ?? []).filter((a) => !seen.has(a));
    summary.push({ pass: name, steps: pass.length, captures: index, statesEntered: [...seen].sort(), missing });
    const status = missing.length ? `MISSING ${missing.join(", ")}` : "ok";
    console.log(`${name.padEnd(12)} steps=${String(pass.length).padStart(2)} captures=${String(index).padStart(2)} states=${String(seen.size).padStart(2)} ${status}`);
    if (missing.length) failed = true;
    if (result.isError) failed = true;
  }
} finally {
  await client.close();
}

writeFileSync(
  resolve(captureDir, "state-machine-report.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2)}\n`,
);
console.log(`\ncaptures + report written to ${captureDir}`);
if (failed) process.exitCode = 1;
