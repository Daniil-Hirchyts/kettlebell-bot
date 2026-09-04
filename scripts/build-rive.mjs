#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, StdioClientTransport } from "./rive-mcp-sdk.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const importedPath = resolve(projectRoot, "assets/svg/kettlebell-bot.scene.json");
const scenePath = resolve(projectRoot, "rive/kettlebell-bot.scene.json");
const outPath = resolve(projectRoot, "rive/kettlebell-bot.riv");
const imported = JSON.parse(readFileSync(importedPath, "utf8"));
const importedById = new Map(imported.shapes.map((shape) => [shape.id, structuredClone(shape)]));

function placeShape(id, parent, x, y, z) {
  const shape = importedById.get(id);
  if (!shape) throw new Error(`Missing imported SVG shape: ${id}`);
  return { ...shape, parent, x, y, z };
}

function track(target, property, frames, values, easing = "ease-in-out") {
  if (frames.length !== values.length) throw new Error(`Mismatched ${target}.${property} keyframes`);
  return {
    target,
    property,
    keyframes: frames.map((frame, index) => ({
      frame,
      value: values[index],
      ...(index === 0
        ? {}
        : { easing: Array.isArray(easing) ? (easing[index - 1] ?? "ease-in-out") : easing }),
    })),
  };
}

function motion(name, duration, loop, tracks) {
  return { name, fps: 60, duration, loop, tracks };
}

function transition(from, to, input, value, durationMs = 90) {
  return { from, to, durationMs, condition: { input, op: "==", value } };
}

const smooth = "ease-in-out";
const easeAction = ["ease-in", "emphasized-decel", "ease-out", "smooth"];
const glance = ["emphasized-decel", "hold", "snap", "hold", "smooth", "hold"];

const animations = [
  motion("00_face_neutral", 1, "loop", []),

  // Calm presence: slow weight transfer plus two curious, offset glances.
  motion("01_idle", 288, "loop", [
    track("CharacterTransform", "x", [0, 72, 144, 216, 288], [256, 258, 256, 253.5, 256]),
    track("CharacterTransform", "y", [0, 92, 160, 238, 288], [304, 301.5, 303, 300.8, 304]),
    track("CharacterTransform", "rotation", [0, 72, 144, 216, 288], [0, 0.75, -0.25, -0.62, 0]),
    track("CharacterTransform", "scaleX", [0, 72, 144, 216, 288], [1, 0.985, 1.006, 0.98, 1]),
    track("CharacterTransform", "scaleY", [0, 92, 160, 238, 288], [1, 1.008, 0.998, 1.009, 1]),
    track("Handle", "x", [0, 72, 144, 216, 288], [0, -1.8, 0.5, 2, 0]),
    track("Handle", "rotation", [0, 72, 144, 216, 288], [0, -0.45, 0.18, 0.38, 0]),
    track("Handle", "scaleX", [0, 72, 144, 216, 288], [1, 0.982, 1.004, 0.978, 1]),
    track("FaceTransform", "x", [0, 38, 94, 116, 190, 242, 288], [0, -4, -4, 5.5, 5.5, 0, 0], glance),
    track("FaceTransform", "y", [0, 38, 94, 116, 190, 242, 288], [0, -2, -2, 0.8, 0.8, 0, 0], glance),
    track("EyeLeft", "x", [0, 38, 116, 242, 288], [-36, -37.5, -34, -36, -36], ["emphasized-decel", "snap", "smooth", "hold"]),
    track("EyeRight", "x", [0, 38, 116, 242, 288], [36, 34, 37.5, 36, 36], ["emphasized-decel", "snap", "smooth", "hold"]),
    track("EyeLeft", "scaleX", [0, 38, 116, 242, 288], [1, 1.08, 0.9, 1, 1], ["emphasized-decel", "snap", "smooth", "hold"]),
    track("EyeRight", "scaleX", [0, 38, 116, 242, 288], [1, 0.9, 1.08, 1, 1], ["emphasized-decel", "snap", "smooth", "hold"]),
    track("EyeLeft", "scaleY", [0, 38, 116, 242, 288], [1, 1.025, 0.97, 1, 1], ["emphasized-decel", "snap", "smooth", "hold"]),
    track("EyeRight", "scaleY", [0, 38, 116, 242, 288], [1, 0.97, 1.025, 1, 1], ["emphasized-decel", "snap", "smooth", "hold"]),
  ]),

  // Weighted nod: the body anticipates, the handle lags, then the eyes meet the user.
  motion("02_acknowledge", 30, "oneShot", [
    track("CharacterTransform", "y", [0, 5, 14, 22, 30], [304, 308, 296, 303, 304], easeAction),
    track("CharacterTransform", "rotation", [0, 5, 14, 22, 30], [0, -1.1, 0.75, -0.2, 0], easeAction),
    track("CharacterTransform", "scaleX", [0, 5, 14, 22, 30], [1, 1.035, 0.972, 1.008, 1], easeAction),
    track("CharacterTransform", "scaleY", [0, 5, 14, 22, 30], [1, 0.965, 1.026, 0.994, 1], easeAction),
    track("Handle", "y", [0, 7, 16, 23, 30], [0, 3.5, -2, 0.8, 0], easeAction),
    track("Handle", "rotation", [0, 7, 16, 23, 30], [0, 0.8, -0.45, 0.15, 0], easeAction),
    track("FaceTransform", "y", [0, 5, 14, 22, 30], [0, 4, -4, 1, 0], easeAction),
    track("EyeLeft", "scaleY", [0, 5, 14, 22, 30], [1, 0.84, 1.12, 0.98, 1], easeAction),
    track("EyeRight", "scaleY", [0, 5, 14, 22, 30], [1, 0.84, 1.12, 0.98, 1], easeAction),
    track("EyeLeft", "scaleX", [0, 5, 14, 22, 30], [1, 1.06, 0.96, 1.01, 1], easeAction),
    track("EyeRight", "scaleX", [0, 5, 14, 22, 30], [1, 1.06, 0.96, 1.01, 1], easeAction),
    track("EyeLeft", "x", [0, 14, 30], [-36, -38, -36], ["emphasized-decel", "smooth"]),
    track("EyeRight", "x", [0, 14, 30], [36, 38, 36], ["emphasized-decel", "smooth"]),
  ]),

  // The face orbits across a shallow turn; near and far eyes trade visual weight.
  motion("03_thinking", 144, "loop", [
    track("CharacterTransform", "x", [0, 34, 82, 118, 144], [256, 252.5, 259, 254.5, 256]),
    track("CharacterTransform", "y", [0, 34, 82, 118, 144], [304, 301.5, 303, 300.5, 304]),
    track("CharacterTransform", "rotation", [0, 34, 82, 118, 144], [0, -1.65, 1.45, -0.8, 0]),
    track("CharacterTransform", "scaleX", [0, 34, 82, 118, 144], [1, 0.965, 1.018, 0.978, 1]),
    track("CharacterTransform", "scaleY", [0, 34, 82, 118, 144], [1, 1.008, 0.995, 1.006, 1]),
    track("Handle", "x", [0, 34, 82, 118, 144], [0, 2.8, -3, 1.8, 0]),
    track("Handle", "rotation", [0, 34, 82, 118, 144], [0, 1.1, -0.95, 0.55, 0]),
    track("Handle", "scaleX", [0, 34, 82, 118, 144], [1, 0.955, 1.012, 0.97, 1]),
    track("Handle", "scaleY", [0, 34, 82, 118, 144], [1, 1.018, 0.996, 1.012, 1]),
    track("Body", "x", [0, 34, 82, 144], [0, -1.2, 1.2, 0]),
    track("Body", "scaleX", [0, 34, 82, 118, 144], [1, 1.012, 0.992, 1.008, 1]),
    track("Body", "scaleY", [0, 34, 82, 118, 144], [1, 0.996, 1.004, 0.997, 1]),
    track("FaceTransform", "x", [0, 30, 66, 78, 112, 144], [0, -9, -2, 8, 4, 0], ["emphasized-decel", "smooth", "snap", "smooth", "smooth"]),
    track("FaceTransform", "y", [0, 30, 66, 78, 112, 144], [0, -5, 1, -2.5, 2, 0], ["emphasized-decel", "smooth", "snap", "smooth", "smooth"]),
    track("FaceTransform", "rotation", [0, 30, 78, 112, 144], [0, -1.8, 1.4, -0.4, 0], ["emphasized-decel", "snap", "smooth", "smooth"]),
    track("EyeLeft", "scaleX", [0, 30, 78, 112, 144], [1, 1.2, 0.76, 0.92, 1], ["emphasized-decel", "snap", "smooth", "smooth"]),
    track("EyeRight", "scaleX", [0, 30, 78, 112, 144], [1, 0.76, 1.2, 1.08, 1], ["emphasized-decel", "snap", "smooth", "smooth"]),
    track("EyeLeft", "scaleY", [0, 30, 78, 144], [1, 1.04, 0.92, 1], ["emphasized-decel", "snap", "smooth"]),
    track("EyeRight", "scaleY", [0, 30, 78, 144], [1, 0.92, 1.04, 1], ["emphasized-decel", "snap", "smooth"]),
    track("EyeLeft", "rotation", [0, 30, 78, 144], [0, -3.5, 2.5, 0], ["emphasized-decel", "snap", "smooth"]),
    track("EyeRight", "rotation", [0, 30, 78, 144], [0, -1.5, 4, 0], ["emphasized-decel", "snap", "smooth"]),
  ]),

  // Four-beat orbital cycle: counter-motion implies depth, momentum, and real mass.
  motion("04_working", 84, "loop", [
    track("CharacterTransform", "x", [0, 21, 42, 63, 84], [256, 261, 256, 251, 256]),
    track("CharacterTransform", "y", [0, 21, 42, 63, 84], [304, 300, 296.5, 301.5, 304]),
    track("CharacterTransform", "rotation", [0, 21, 42, 63, 84], [0, 1.8, 0, -1.8, 0]),
    track("CharacterTransform", "scaleX", [0, 21, 42, 63, 84], [1, 0.962, 1.018, 0.968, 1]),
    track("CharacterTransform", "scaleY", [0, 21, 42, 63, 84], [1, 1.01, 0.992, 1.008, 1]),
    track("Handle", "x", [0, 21, 42, 63, 84], [0, -3, 0, 3, 0]),
    track("Handle", "y", [0, 21, 42, 63, 84], [0, 1, -2, 1, 0]),
    track("Handle", "rotation", [0, 21, 42, 63, 84], [0, -1.25, 0, 1.25, 0]),
    track("Handle", "scaleX", [0, 21, 42, 63, 84], [1, 0.94, 1.015, 0.94, 1]),
    track("Handle", "scaleY", [0, 21, 42, 63, 84], [1, 1.02, 0.995, 1.02, 1]),
    track("Body", "x", [0, 21, 42, 63, 84], [0, 1.1, 0, -1.1, 0]),
    track("Body", "scaleX", [0, 21, 42, 63, 84], [1, 1.01, 0.993, 1.01, 1]),
    track("Body", "scaleY", [0, 21, 42, 63, 84], [1, 0.997, 1.004, 0.997, 1]),
    track("FaceTransform", "x", [0, 21, 42, 63, 84], [0, 9, 0, -9, 0]),
    track("FaceTransform", "y", [0, 21, 42, 63, 84], [0, -3, -5, -2, 0]),
    track("FaceTransform", "rotation", [0, 21, 42, 63, 84], [0, 1.2, 0, -1.2, 0]),
    track("EyeLeft", "x", [0, 21, 42, 63, 84], [-36, -33, -36, -39, -36]),
    track("EyeRight", "x", [0, 21, 42, 63, 84], [36, 39, 36, 33, 36]),
    track("EyeLeft", "y", [0, 21, 42, 63, 84], [-35, -36.5, -35, -33.5, -35]),
    track("EyeRight", "y", [0, 21, 42, 63, 84], [-35, -33.5, -35, -36.5, -35]),
    track("EyeLeft", "scaleX", [0, 21, 42, 63, 84], [1, 0.74, 1.08, 1.24, 1]),
    track("EyeRight", "scaleX", [0, 21, 42, 63, 84], [1, 1.24, 1.08, 0.74, 1]),
    track("EyeLeft", "scaleY", [0, 21, 42, 63, 84], [1, 0.9, 1.08, 1.02, 1]),
    track("EyeRight", "scaleY", [0, 21, 42, 63, 84], [1, 1.02, 1.08, 0.9, 1]),
  ]),

  // Low-energy lean with a delayed glance back toward the task.
  motion("05_waiting", 216, "loop", [
    track("CharacterTransform", "x", [0, 48, 156, 216], [256, 253.5, 253.5, 256], [smooth, "hold", smooth]),
    track("CharacterTransform", "y", [0, 48, 156, 216], [304, 306.5, 306, 304]),
    track("CharacterTransform", "rotation", [0, 48, 156, 216], [0, -1.25, -0.8, 0]),
    track("CharacterTransform", "scaleX", [0, 48, 156, 216], [1, 1.012, 1.006, 1]),
    track("CharacterTransform", "scaleY", [0, 48, 156, 216], [1, 0.992, 0.996, 1]),
    track("Handle", "x", [0, 48, 156, 216], [0, 2.5, 1.5, 0]),
    track("Handle", "rotation", [0, 48, 156, 216], [0, 0.8, 0.5, 0]),
    track("FaceTransform", "x", [0, 42, 118, 136, 166, 216], [0, 8, 8, -2, -2, 0], ["emphasized-decel", "hold", "snap", "hold", "smooth"]),
    track("FaceTransform", "y", [0, 42, 166, 216], [0, 4, 4, 0], ["emphasized-decel", "hold", "smooth"]),
    track("EyeLeft", "scaleY", [0, 42, 118, 126, 136, 166, 216], [1, 0.84, 0.84, 0.66, 0.82, 0.82, 1], ["emphasized-decel", "hold", "ease-in", "ease-out", "hold", "smooth"]),
    track("EyeRight", "scaleY", [0, 42, 118, 126, 136, 166, 216], [1, 0.78, 0.78, 0.62, 0.8, 0.8, 1], ["emphasized-decel", "hold", "ease-in", "ease-out", "hold", "smooth"]),
    track("EyeLeft", "scaleX", [0, 42, 136, 216], [1, 0.84, 1.1, 1], ["emphasized-decel", "snap", "smooth"]),
    track("EyeRight", "scaleX", [0, 42, 136, 216], [1, 1.12, 0.82, 1], ["emphasized-decel", "snap", "smooth"]),
  ]),

  // A sharp, readable recoil before the persistent blocked posture takes over.
  motion("06_blocked_enter", 30, "oneShot", [
    track("CharacterTransform", "x", [0, 4, 8, 12, 17, 23, 30], [256, 249, 264, 251.5, 260.5, 254, 256], ["snap", "smooth", "smooth", "smooth", "smooth", "ease-out"]),
    track("CharacterTransform", "y", [0, 4, 12, 30], [304, 307, 302, 304], ["ease-in", "smooth", "ease-out"]),
    track("CharacterTransform", "rotation", [0, 4, 8, 12, 17, 30], [0, -2.5, 2.2, -1.7, 1.2, -0.8], ["snap", "smooth", "smooth", "smooth", "ease-out"]),
    track("CharacterTransform", "scaleX", [0, 4, 8, 17, 30], [1, 1.035, 0.958, 1.018, 1.01], ["snap", "smooth", "smooth", "ease-out"]),
    track("CharacterTransform", "scaleY", [0, 4, 8, 30], [1, 0.97, 1.025, 0.992], ["snap", "smooth", "ease-out"]),
    track("Handle", "x", [0, 6, 11, 18, 30], [0, 5, -4, 2.5, 1.5], ["snap", "smooth", "smooth", "ease-out"]),
    track("Handle", "rotation", [0, 6, 11, 30], [0, 2.1, -1.5, 0.6], ["snap", "smooth", "ease-out"]),
    track("FaceTransform", "x", [0, 5, 10, 16, 30], [0, -5, 5, -3, -2], ["snap", "smooth", "smooth", "ease-out"]),
    track("EyeLeft", "scaleY", [0, 6, 15, 30], [1, 0.58, 0.76, 0.72], ["ease-in", "ease-out", "ease-out"]),
    track("EyeRight", "scaleY", [0, 6, 15, 30], [1, 0.68, 0.82, 0.78], ["ease-in", "ease-out", "ease-out"]),
    track("EyeLeft", "scaleX", [0, 6, 30], [1, 1.2, 1.08], ["ease-in", "ease-out"]),
    track("EyeRight", "scaleX", [0, 6, 30], [1, 1.08, 0.94], ["ease-in", "ease-out"]),
    track("EyeLeft", "y", [0, 6, 30], [-35, -38, -37], ["ease-in", "ease-out"]),
    track("EyeRight", "y", [0, 6, 30], [-35, -32, -33], ["ease-in", "ease-out"]),
  ]),

  // Uneasy hold: the weight crosses slowly while the eyes remain deliberately uneven.
  motion("07_blocked_idle", 216, "loop", [
    track("CharacterTransform", "x", [0, 108, 216], [254, 258, 254]),
    track("CharacterTransform", "y", [0, 108, 216], [306, 304.5, 306]),
    track("CharacterTransform", "rotation", [0, 108, 216], [-0.8, 0.9, -0.8]),
    track("CharacterTransform", "scaleX", [0, 108, 216], [1.01, 0.985, 1.01]),
    track("CharacterTransform", "scaleY", [0, 108, 216], [0.992, 1.002, 0.992]),
    track("Handle", "x", [0, 108, 216], [1.5, -2, 1.5]),
    track("Handle", "rotation", [0, 108, 216], [0.6, -0.7, 0.6]),
    track("FaceTransform", "x", [0, 82, 96, 164, 216], [-2, -2, 3, 3, -2], ["hold", "snap", "hold", "smooth"]),
    track("FaceTransform", "y", [0, 108, 216], [2, 0.5, 2]),
    track("EyeLeft", "scaleY", [0, 108, 216], [0.72, 0.8, 0.72]),
    track("EyeRight", "scaleY", [0, 108, 216], [0.78, 0.7, 0.78]),
    track("EyeLeft", "scaleX", [0, 108, 216], [1.08, 0.92, 1.08]),
    track("EyeRight", "scaleX", [0, 108, 216], [0.94, 1.1, 0.94]),
    track("EyeLeft", "y", [0, 108, 216], [-37, -33, -37]),
    track("EyeRight", "y", [0, 108, 216], [-33, -37, -33]),
  ]),

  // Anticipation, lift, quarter-turn illusion, then a weighted landing.
  motion("08_done", 48, "oneShot", [
    track("CharacterTransform", "x", [0, 5, 16, 28, 39, 48], [256, 256, 262, 252.5, 257, 256], ["ease-in", "emphasized-decel", "ease-out", "ease-out", "smooth"]),
    track("CharacterTransform", "y", [0, 5, 16, 28, 39, 48], [304, 309, 286, 297, 301.5, 304], ["ease-in", "emphasized-decel", "ease-out", "ease-out", "smooth"]),
    track("CharacterTransform", "rotation", [0, 5, 16, 28, 39, 48], [0, -0.7, 2.7, -1.2, 0.45, 0], ["ease-in", "emphasized-decel", "ease-out", "ease-out", "smooth"]),
    track("CharacterTransform", "scaleX", [0, 5, 16, 28, 39, 48], [1, 1.04, 0.935, 1.024, 0.992, 1], ["ease-in", "emphasized-decel", "ease-out", "ease-out", "smooth"]),
    track("CharacterTransform", "scaleY", [0, 5, 16, 28, 39, 48], [1, 0.958, 1.045, 0.985, 1.006, 1], ["ease-in", "emphasized-decel", "ease-out", "ease-out", "smooth"]),
    track("Handle", "x", [0, 7, 18, 30, 48], [0, 2, -5, 3, 0], easeAction),
    track("Handle", "y", [0, 7, 18, 30, 48], [0, 4, -4, 2, 0], easeAction),
    track("Handle", "rotation", [0, 7, 18, 30, 48], [0, 0.9, -2.2, 1.1, 0], easeAction),
    track("Handle", "scaleX", [0, 7, 18, 30, 48], [1, 1.035, 0.9, 1.03, 1], easeAction),
    track("Handle", "scaleY", [0, 7, 18, 30, 48], [1, 0.988, 1.035, 0.99, 1], easeAction),
    track("FaceTransform", "x", [0, 5, 16, 28, 48], [0, 0, 9, -5, 0], ["ease-in", "emphasized-decel", "ease-out", "smooth"]),
    track("FaceTransform", "y", [0, 5, 16, 28, 48], [0, 4, -8, -2, 0], ["ease-in", "emphasized-decel", "ease-out", "smooth"]),
    track("EyeLeft", "x", [0, 16, 28, 48], [-36, -41, -38, -36], ["emphasized-decel", "ease-out", "smooth"]),
    track("EyeRight", "x", [0, 16, 28, 48], [36, 41, 38, 36], ["emphasized-decel", "ease-out", "smooth"]),
    track("EyeLeft", "y", [0, 16, 48], [-35, -39, -35], ["emphasized-decel", "smooth"]),
    track("EyeRight", "y", [0, 16, 48], [-35, -37, -35], ["emphasized-decel", "smooth"]),
    track("EyeLeft", "scaleX", [0, 5, 16, 28, 48], [1, 0.92, 1.26, 1.08, 1], easeAction),
    track("EyeRight", "scaleX", [0, 5, 16, 28, 48], [1, 0.92, 0.78, 1.08, 1], easeAction),
    track("EyeLeft", "scaleY", [0, 5, 16, 28, 48], [1, 0.82, 1.18, 1.04, 1], easeAction),
    track("EyeRight", "scaleY", [0, 5, 16, 28, 48], [1, 0.82, 1.18, 1.04, 1], easeAction),
  ]),

  // Vertical close only; slight width expansion preserves each pill eye's visual weight.
  motion("09_blink", 10, "oneShot", [
    track("EyeLeft", "scaleY", [0, 3, 5, 10], [1, 0.08, 0.08, 1], ["ease-in", "hold", "ease-out"]),
    track("EyeRight", "scaleY", [0, 3, 5, 10], [1, 0.08, 0.08, 1], ["ease-in", "hold", "ease-out"]),
    track("EyeLeft", "scaleX", [0, 3, 5, 10], [1, 1.1, 1.1, 1], ["ease-in", "hold", "ease-out"]),
    track("EyeRight", "scaleX", [0, 3, 5, 10], [1, 1.1, 1.1, 1], ["ease-in", "hold", "ease-out"]),
  ]),
];

const persistentStates = [
  { name: "Idle", animation: "01_idle", value: 0 },
  { name: "Thinking", animation: "03_thinking", value: 1 },
  { name: "Working", animation: "04_working", value: 2 },
  { name: "Waiting", animation: "05_waiting", value: 3 },
  { name: "BlockedIdle", animation: "07_blocked_idle", value: 4 },
];

const statusTransitions = [];
for (const from of persistentStates) {
  for (const to of persistentStates) {
    if (from.name === to.name || to.name === "BlockedIdle") continue;
    statusTransitions.push(transition(from.name, to.name, "status", to.value));
  }
  if (from.name !== "BlockedIdle") {
    statusTransitions.push(transition(from.name, "BlockedEnter", "status", 4, 55));
  }
}

const actionTransitions = [];
for (const from of ["Idle", "Thinking", "Working", "Waiting", "BlockedEnter", "BlockedIdle"]) {
  actionTransitions.push({ from, to: "Acknowledge", durationMs: 45, condition: { input: "acknowledge" } });
  actionTransitions.push({ from, to: "Done", durationMs: 45, condition: { input: "complete" } });
}

const scene = {
  artboard: { name: "KettlebellBot", width: 512, height: 512 },
  groups: [
    { id: "KettlebellBotRoot", x: 0, y: 0 },
    { id: "CharacterTransform", x: 256, y: 304, parent: "KettlebellBotRoot" },
    { id: "Handle", x: 0, y: 0, parent: "CharacterTransform" },
    { id: "Body", x: 0, y: 0, parent: "CharacterTransform" },
    { id: "FaceTransform", x: 0, y: 0, parent: "CharacterTransform" },
    { id: "EyeLeft", x: -36, y: -35, parent: "FaceTransform" },
    { id: "EyeRight", x: 36, y: -35, parent: "FaceTransform" },
  ],
  shapes: [
    placeShape("handle-shape", "Handle", 0, -170, 0),
    placeShape("body-shape", "Body", 0, -0.5, 1),
    placeShape("eye-left", "EyeLeft", 0, 0, 2),
    placeShape("eye-right", "EyeRight", 0, 0, 3),
  ],
  animations,
  stateMachine: {
    name: "KettlebellBotMachine",
    inputs: [
      { name: "status", type: "number", initial: 0 },
      { name: "acknowledge", type: "trigger" },
      { name: "complete", type: "trigger" },
      { name: "blink", type: "trigger" },
    ],
    layers: [
      {
        name: "Semantic State",
        states: [
          { name: "Idle", animation: "01_idle" },
          { name: "Acknowledge", animation: "02_acknowledge" },
          { name: "Thinking", animation: "03_thinking" },
          { name: "Working", animation: "04_working" },
          { name: "Waiting", animation: "05_waiting" },
          { name: "BlockedEnter", animation: "06_blocked_enter" },
          { name: "BlockedIdle", animation: "07_blocked_idle" },
          { name: "Done", animation: "08_done" },
        ],
        transitions: [
          { from: "entry", to: "Idle", durationMs: 0 },
          ...statusTransitions,
          ...actionTransitions,
          { from: "Acknowledge", to: "Idle", durationMs: 80, exitTimeMs: 500 },
          { from: "BlockedEnter", to: "BlockedIdle", durationMs: 85, exitTimeMs: 500 },
          { from: "Done", to: "Idle", durationMs: 100, exitTimeMs: 800 },
        ],
      },
      {
        name: "Blink Layer",
        states: [
          { name: "EyesOpen", animation: "00_face_neutral" },
          { name: "Blink", animation: "09_blink" },
        ],
        transitions: [
          { from: "entry", to: "EyesOpen", durationMs: 0 },
          { from: "any", to: "Blink", durationMs: 0, condition: { input: "blink" } },
          { from: "Blink", to: "EyesOpen", durationMs: 0, exitTimeMs: 167 },
        ],
      },
    ],
  },
};

writeFileSync(scenePath, `${JSON.stringify(scene, null, 2)}\n`);

const client = new Client({ name: "kettlebell-bot-builder", version: "1.0.0" });
const transport = new StdioClientTransport({ command: "rive-mcp", args: [] });
await client.connect(transport);

try {
  const result = await client.callTool({
    name: "riv_create",
    arguments: { outPath, scene, previewTime: 0.8 },
  });
  const summary = result.content?.find((item) => item.type === "text");
  if (summary) process.stdout.write(`${summary.text}\n`);
  const preview = result.content?.find((item) => item.type === "image");
  if (preview) {
    writeFileSync(
      resolve(projectRoot, "previews/static/kettlebell-bot-rive-512.png"),
      Buffer.from(preview.data, "base64"),
    );
  }
  if (result.isError) process.exitCode = 1;
} finally {
  await client.close();
}
