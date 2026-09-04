#!/usr/bin/env node

import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const rivPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const animationDir = resolve(projectRoot, "previews/animations");
const staticDir = resolve(projectRoot, "previews/static");

const animations = [
  ["idle", "01_idle", 4.8, 30],
  ["acknowledge", "02_acknowledge", 0.5, 60],
  ["thinking", "03_thinking", 2.4, 30],
  ["working", "04_working", 1.4, 30],
  ["waiting", "05_waiting", 3.6, 30],
  ["blocked", "06_blocked_enter", 0.5, 60],
  ["blocked-idle", "07_blocked_idle", 3.6, 30],
  ["done", "08_done", 0.8, 60],
  ["blink", "09_blink", 10 / 60, 60],
];

const client = new Client({ name: "kettlebell-bot-renderer", version: "1.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });
await client.connect(transport);

try {
  for (const [fileName, animation, duration, fps] of animations) {
    const result = await client.callTool({
      name: "riv_render_apng",
      arguments: {
        path: rivPath,
        artboard: "KettlebellBot",
        animation,
        duration,
        fps,
        width: 384,
        height: 384,
        transparent: true,
        loops: 0,
        out: resolve(animationDir, `${fileName}.apng`),
      },
    });
    const text = result.content?.find((item) => item.type === "text");
    if (text) process.stdout.write(`${text.text}\n`);
    if (result.isError) process.exitCode = 1;
  }

  for (const size of [512, 128, 64, 32, 24]) {
    const result = await client.callTool({
      name: "riv_render_frame",
      arguments: {
        path: rivPath,
        artboard: "KettlebellBot",
        animation: "01_idle",
        time: 0,
        width: size,
        height: size,
        outPath: resolve(staticDir, `kettlebell-bot-rive-${size}.png`),
      },
    });
    if (result.isError) process.exitCode = 1;
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
        animation: "01_idle",
        time: 0,
        width: 256,
        height: 256,
        background,
        outPath: resolve(staticDir, `kettlebell-bot-on-${name}.png`),
      },
    });
    if (result.isError) process.exitCode = 1;
  }

  for (const [name, animation] of [
    ["thinking", "03_thinking"],
    ["working", "04_working"],
  ]) {
    const result = await client.callTool({
      name: "riv_render_apng",
      arguments: {
        path: rivPath,
        artboard: "KettlebellBot",
        animation,
        duration: name === "thinking" ? 2.4 : 1.4,
        fps: 30,
        width: 32,
        height: 32,
        transparent: true,
        loops: 0,
        out: resolve(animationDir, `${name}-32.apng`),
      },
    });
    if (result.isError) process.exitCode = 1;
  }
} finally {
  await client.close();
}
