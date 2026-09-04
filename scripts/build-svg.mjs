#!/usr/bin/env node
//
// Generate the editable vector source from scripts/lib/geometry.mjs.
//
//   node scripts/build-svg.mjs
//
// Writes assets/svg/kettlebell-bot.svg (front view, layered and named to match
// the Rive rig) and assets/svg/kettlebell-bot-turnaround.svg (seven facings
// produced by the same projection model the .riv animates).

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BODY_POINTS,
  COLOR,
  DEPTH_SHAPES,
  EYE_VARIANTS,
  EYE_Y,
  FIELD,
  HANDLE_CY,
  HANDLE_HOLE,
  HANDLE_OUTER,
  RIM_POINTS,
  ROOT_SCALE,
  ROOT_X,
  ROOT_Y,
} from "./lib/geometry.mjs";
import { compoundPathData, pathData, round as r, splitColor } from "./lib/svg.mjs";
import { turnPose } from "./lib/turn.mjs";
import {
  HOLE_BOTTOM_HANDLE,
  HOLE_SIDE_X,
  HOLE_TOP_HANDLE,
} from "./lib/geometry.mjs";

const projectRoot = resolve(import.meta.dirname, "..");

const bodyPath = pathData(BODY_POINTS, true);
const handlePath = compoundPathData([
  { closed: true, points: HANDLE_OUTER },
  { closed: true, points: HANDLE_HOLE },
]);
const rimPath = pathData(RIM_POINTS, false);

/** The handle opening, squeezed by the yaw model's hole factor. */
function holePath(k = 1) {
  const points = HANDLE_HOLE.map((p, i) => {
    if (i === 0) return { ...p, cubic: { ...p.cubic, distance: HOLE_TOP_HANDLE * k } };
    if (i === 2) return { ...p, cubic: { ...p.cubic, distance: HOLE_BOTTOM_HANDLE * k } };
    return { ...p, x: Math.sign(p.x) * HOLE_SIDE_X * k };
  });
  return pathData(points, true);
}

const gradients = `
  <defs>
    <linearGradient id="bodyFill" x1="0" y1="-140" x2="0" y2="140" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COLOR.bodyTop}" />
      <stop offset="1" stop-color="${COLOR.bodyBottom}" />
    </linearGradient>
    <linearGradient id="handleFill" x1="0" y1="-78" x2="0" y2="78" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${COLOR.handleTop}" />
      <stop offset="1" stop-color="${COLOR.handleBottom}" />
    </linearGradient>
    <radialGradient id="frontField" cx="0" cy="-14" r="112" gradientUnits="userSpaceOnUse">
${FIELD.front.map((s) => {
  const { hex, opacity } = splitColor(s.color);
  return `      <stop offset="${s.position}" stop-color="${hex}" stop-opacity="${opacity}" />`;
}).join("\n")}
    </radialGradient>
    <radialGradient id="backField" cx="0" cy="-6" r="118" gradientUnits="userSpaceOnUse">
${FIELD.back.map((s) => {
  const { hex, opacity } = splitColor(s.color);
  return `      <stop offset="${s.position}" stop-color="${hex}" stop-opacity="${opacity}" />`;
}).join("\n")}
    </radialGradient>
    <radialGradient id="topShade" cx="0" cy="6" r="74" gradientUnits="userSpaceOnUse">
${FIELD.topShade.map((s) => {
  const { hex, opacity } = splitColor(s.color);
  return `      <stop offset="${s.position}" stop-color="${hex}" stop-opacity="${opacity}" />`;
}).join("\n")}
    </radialGradient>
    <clipPath id="bodyMask">
      <path d="${bodyPath}" />
    </clipPath>
  </defs>`;

const eyeMarkup = (side, sign) => {
  const variant = EYE_VARIANTS[0];
  return `        <g id="eye-${side}" transform="translate(${sign * 36} 0)">
          <rect x="${-variant.width / 2}" y="${-variant.height / 2}" width="${variant.width}" height="${variant.height}" rx="${variant.cornerRadius}" fill="${COLOR.eye}" />
        </g>`;
};

const depthLayers = (pose = turnPose(0)) => `
      <g id="depth" clip-path="url(#bodyMask)">
        <ellipse id="top-shade" cx="${DEPTH_SHAPES.topShade.x}" cy="${DEPTH_SHAPES.topShade.y}" rx="${DEPTH_SHAPES.topShade.width / 2}" ry="${DEPTH_SHAPES.topShade.height / 2}" fill="url(#topShade)" />
        <g id="turn-front" transform="translate(${r(pose["TurnFront|x"])} 0) scale(${r(pose["TurnFront|scaleX"])} 1)" opacity="${r(pose["TurnFront|opacity"])}">
          <ellipse cx="${DEPTH_SHAPES.facePlate.x}" cy="${DEPTH_SHAPES.facePlate.y}" rx="${DEPTH_SHAPES.facePlate.width / 2}" ry="${DEPTH_SHAPES.facePlate.height / 2}" fill="url(#frontField)" />
        </g>
        <g id="turn-back" transform="translate(${r(pose["TurnBack|x"])} 0) scale(${r(pose["TurnBack|scaleX"])} 1)" opacity="${r(pose["TurnBack|opacity"])}">
          <ellipse cx="${DEPTH_SHAPES.backPlate.x}" cy="${DEPTH_SHAPES.backPlate.y}" rx="${DEPTH_SHAPES.backPlate.width / 2}" ry="${DEPTH_SHAPES.backPlate.height / 2}" fill="url(#backField)" />
          <rect x="${-DEPTH_SHAPES.backSeam.width / 2}" y="${DEPTH_SHAPES.backSeam.y - DEPTH_SHAPES.backSeam.height / 2}" width="${DEPTH_SHAPES.backSeam.width}" height="${DEPTH_SHAPES.backSeam.height}" rx="${DEPTH_SHAPES.backSeam.cornerRadius}" fill="${COLOR.backDetail}" opacity="0.85" />
          <rect x="${-DEPTH_SHAPES.backVentA.width / 2}" y="${DEPTH_SHAPES.backVentA.y - DEPTH_SHAPES.backVentA.height / 2}" width="${DEPTH_SHAPES.backVentA.width}" height="${DEPTH_SHAPES.backVentA.height}" rx="${DEPTH_SHAPES.backVentA.cornerRadius}" fill="${COLOR.backDetail}" opacity="0.72" />
          <rect x="${-DEPTH_SHAPES.backVentB.width / 2}" y="${DEPTH_SHAPES.backVentB.y - DEPTH_SHAPES.backVentB.height / 2}" width="${DEPTH_SHAPES.backVentB.width}" height="${DEPTH_SHAPES.backVentB.height}" rx="${DEPTH_SHAPES.backVentB.cornerRadius}" fill="${COLOR.backDetail}" opacity="0.5" />
        </g>
        <path id="rim-light" d="${rimPath}" fill="none" stroke="${COLOR.rim}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" opacity="0.24" />
      </g>`;

const front = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none" role="img" aria-labelledby="title description">
  <title id="title">Kettlebell Bot</title>
  <desc id="description">A charcoal kettlebell-shaped assistant with a real handle opening, soft form shading and two vertical off-white eyes.</desc>
${gradients}

  <!-- Group and shape ids mirror the Rive rig in rive/kettlebell-bot.scene.json. -->
  <g id="kettlebell-bot" transform="translate(${ROOT_X} ${ROOT_Y}) scale(${ROOT_SCALE})">
    <g id="handle" transform="translate(0 ${HANDLE_CY})">
      <path id="handle-shape" fill-rule="evenodd" clip-rule="evenodd" d="${handlePath}" fill="url(#handleFill)" />
    </g>

    <g id="body">
      <path id="body-core" d="${bodyPath}" fill="url(#bodyFill)" />
${depthLayers()}
    </g>

    <g id="face" transform="translate(0 ${EYE_Y})">
${eyeMarkup("left", -1)}
${eyeMarkup("right", 1)}
    </g>
  </g>
</svg>
`;

writeFileSync(resolve(projectRoot, "assets/svg/kettlebell-bot.svg"), front);

// ---------------------------------------------------------------------------
// Turnaround sheet — the same projection model, drawn as static vector poses.
// ---------------------------------------------------------------------------
const FACINGS = [0, 60, 120, 180, 240, 300, 360];
const CELL = 380;
const sheetWidth = FACINGS.length * CELL;

const cell = (deg, index) => {
  const pose = turnPose(deg);
  const hole = pose["handle-shape#p1_3|x"] / HOLE_SIDE_X;
  const eye = (side) => {
    const sign = side === "L" ? "L" : "R";
    const opacity = pose[`Eye${sign}|opacity`];
    if (opacity <= 0.005) return "";
    return `        <g transform="translate(${r(pose[`Eye${sign}|x`])} 0) scale(${r(pose[`Eye${sign}|scaleX`])} 1)" opacity="${r(opacity)}">
          <rect x="-12" y="-31" width="24" height="62" rx="12" fill="${COLOR.eye}" />
        </g>`;
  };
  return `  <g id="facing-${deg}" transform="translate(${index * CELL + CELL / 2} 300) scale(0.78)">
    <g transform="translate(0 ${HANDLE_CY}) scale(${r(pose["HandlePlate|scaleX"])} 1)">
      <path fill-rule="evenodd" clip-rule="evenodd" d="${pathData(HANDLE_OUTER, true)} ${holePath(hole)}" fill="url(#handleFill)" />
    </g>
    <g transform="scale(${r(pose["BodyPlate|scaleX"])} 1)">
      <path d="${bodyPath}" fill="url(#bodyFill)" />
${depthLayers(pose)}
    </g>
    <g transform="translate(0 ${EYE_Y})">
${eye("L")}
${eye("R")}
    </g>
    <text x="0" y="230" text-anchor="middle" font-family="ui-monospace, monospace" font-size="26" fill="#7C828E">${deg}&#176;</text>
  </g>`;
};

const turnaround = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="600" viewBox="0 0 ${sheetWidth} 600" fill="none" role="img" aria-labelledby="turn-title">
  <title id="turn-title">Kettlebell Bot turnaround</title>
${gradients}
${FACINGS.map(cell).join("\n")}
</svg>
`;

writeFileSync(resolve(projectRoot, "assets/svg/kettlebell-bot-turnaround.svg"), turnaround);
console.log("wrote assets/svg/kettlebell-bot.svg and assets/svg/kettlebell-bot-turnaround.svg");
