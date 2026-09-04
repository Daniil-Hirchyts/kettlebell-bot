#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const captureDir = resolve(projectRoot, "previews/states");
mkdirSync(captureDir, { recursive: true });

const steps = [
  { advance: 0.1, capture: true },
  { input: "status", value: 1, advance: 0.4, capture: true },
  { input: "status", value: 2, advance: 0.3, capture: true },
  { input: "status", value: 3, advance: 0.4, capture: true },
  { input: "status", value: 4, advance: 0.2, capture: true },
  { advance: 0.35, capture: true },
  { input: "status", value: 2, advance: 0.3, capture: true },
  { input: "blink", advance: 0.06, capture: true },
  { advance: 0.12, capture: true },
  { input: "complete", advance: 0.22, capture: true },
  { advance: 0.8, capture: true },
  { input: "acknowledge", advance: 0.16, capture: true },
  { advance: 0.45, capture: true },
];

const labels = [
  "idle",
  "thinking",
  "working",
  "waiting",
  "blocked-enter",
  "blocked-idle",
  "working-return",
  "blink-closed",
  "blink-return",
  "done",
  "done-return",
  "acknowledge",
  "acknowledge-return",
];

const client = new Client({ name: "kettlebell-bot-state-test", version: "1.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });
await client.connect(transport);

try {
  const result = await client.callTool({
    name: "riv_play_state_machine",
    arguments: {
      path: rivPath,
      stateMachine: "KettlebellBotMachine",
      artboard: "KettlebellBot",
      width: 256,
      background: "#F4F5F7",
      steps,
    },
  });
  const text = result.content?.find((item) => item.type === "text");
  if (text) {
    const report = JSON.parse(text.text);
    for (const step of report.report ?? []) {
      const applied = step.applied ? ` ${step.applied.name}=${step.applied.value ?? ""}` : "";
      const changed = (step.statesChanged ?? []).join(", ") || "-";
      console.log(`${String(step.step).padStart(4)}${applied} -> ${changed}`);
    }
    writeFileSync(resolve(captureDir, "state-machine-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  let captureIndex = 0;
  for (const item of result.content ?? []) {
    if (item.type !== "image") continue;
    const label = labels[captureIndex] ?? `capture-${captureIndex + 1}`;
    writeFileSync(
      resolve(captureDir, `${String(captureIndex + 1).padStart(2, "0")}-${label}.png`),
      Buffer.from(item.data, "base64"),
    );
    captureIndex += 1;
  }
  console.log(`Saved ${captureIndex} captures to ${captureDir}`);
  if (result.isError) process.exitCode = 1;
} finally {
  await client.close();
}
