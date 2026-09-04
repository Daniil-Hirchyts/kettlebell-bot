#!/usr/bin/env node
//
// Drift check: does the committed asset still match its source?
//
//   node scripts/verify-asset.mjs
//
// The build is byte-deterministic, so rebuilding to a scratch path and
// comparing is an exact answer. Use this after opening the file in Rive Studio
// or any editor that can write back to rive/kettlebell-bot.{riv,scene.json} —
// those tools save their own view of the scene, which can differ from what
// scripts/lib/*.mjs generates (a stroke-only open path picking up a default
// fill, for example).

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildScene } from "./lib/scene.mjs";
import { validateScene } from "./lib/validate.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const scenePath = resolve(projectRoot, "rive/kettlebell-bot.scene.json");

const { scene, meta } = buildScene();
const { errors } = validateScene(scene, meta);
if (errors.length) {
  for (const error of errors) console.error(`error ${error}`);
  process.exit(1);
}

let drift = false;

// 1 · scene JSON — a text compare, and a field-level report when it differs.
const expectedScene = `${JSON.stringify(scene, null, 2)}\n`;
const actualScene = readFileSync(scenePath, "utf8");
if (expectedScene === actualScene) {
  console.log("scene.json  ok  matches scripts/lib/*.mjs");
} else {
  drift = true;
  console.error("scene.json  DRIFT");
  for (const line of describeSceneDrift(JSON.parse(actualScene), scene)) {
    console.error(`            ${line}`);
  }
}

// 2 · the .riv itself — rebuild to scratch and compare bytes.
const scratch = mkdtempSync(resolve(tmpdir(), "kettlebell-verify-"));
const outPath = resolve(scratch, "rebuild.riv");
const { Client, StdioClientTransport } = await import("./rive-mcp-sdk.mjs");
const client = new Client({ name: "kettlebell-bot-verify", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "rive-mcp", args: [] }));
try {
  const result = await client.callTool({
    name: "riv_create",
    arguments: { outPath, scene, previewTime: 0 },
  });
  if (result.isError) throw new Error("riv_create failed");
  const rebuilt = readFileSync(outPath);
  const shipped = readFileSync(rivPath);
  if (rebuilt.equals(shipped)) {
    console.log(`kettlebell-bot.riv  ok  ${shipped.length} bytes, byte-identical to a clean build`);
  } else {
    drift = true;
    console.error(
      `kettlebell-bot.riv  DRIFT  on disk ${shipped.length} bytes, clean build ${rebuilt.length} bytes`,
    );
  }
} finally {
  await client.close();
  rmSync(scratch, { recursive: true, force: true });
}

if (drift) {
  console.error("\nThe asset on disk was not produced by the current source.");
  console.error("Run `npm run build` to regenerate it, or port the change into scripts/lib/ first.");
  process.exitCode = 1;
} else {
  console.log("\nasset matches source");
}

/** Point at the shapes/animations that differ, rather than dumping the JSON. */
function describeSceneDrift(actual, expected) {
  const notes = [];
  const byId = (list) => new Map(list.map((item) => [item.id ?? item.name, item]));

  for (const [label, key] of [["shape", "shapes"], ["node", "groups"], ["animation", "animations"]]) {
    const a = byId(actual[key] ?? []);
    const e = byId(expected[key] ?? []);
    for (const id of a.keys()) if (!e.has(id)) notes.push(`extra ${label} "${id}"`);
    for (const id of e.keys()) if (!a.has(id)) notes.push(`missing ${label} "${id}"`);
    for (const [id, expectedItem] of e) {
      const actualItem = a.get(id);
      if (!actualItem) continue;
      const fields = new Set([...Object.keys(actualItem), ...Object.keys(expectedItem)]);
      for (const field of fields) {
        const av = JSON.stringify(actualItem[field]);
        const ev = JSON.stringify(expectedItem[field]);
        if (av === ev) continue;
        notes.push(
          `${label} "${id}" · ${field}: on disk ${av ?? "(absent)"} · expected ${ev ?? "(absent)"}`,
        );
      }
    }
  }
  return notes.length ? notes.slice(0, 20) : ["(structure matches; difference is in formatting)"];
}
