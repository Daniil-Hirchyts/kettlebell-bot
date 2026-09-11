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
  GRAIN,
  bodyLuma,
  handleLuma,
  FIELD,
  HANDLE_CY,
  HANDLE_HOLE,
  HANDLE_OUTER,
  HANDLE_EDGE_RUNS,
  HANDLE_SHADING,
  BODY_EDGE_RUNS,
  EDGE_LIGHT,
  LIGHTING,
  ROOT_SCALE,
  ROOT_X,
  ROOT_Y,
} from "./lib/geometry.mjs";
import { compoundPathData, pathData, round as r, splitColor } from "./lib/svg.mjs";
import { turnPose } from "./lib/turn.mjs";
import { bucketSpecks, scatterGrain } from "./lib/grain.mjs";
import { BRIDGE_EDGE_RUNS, HANDLE_BRIDGE, HANDLE_HALF } from "./lib/geometry.mjs";

const projectRoot = resolve(import.meta.dirname, "..");

const bodyPath = pathData(BODY_POINTS, true);
const handlePath = compoundPathData([
  { closed: true, points: HANDLE_OUTER },
  { closed: true, points: HANDLE_HOLE },
]);

/** The see-through window at a pose: the opening as the turn's lens keys it. */
function windowPath(pose) {
  const points = HANDLE_HOLE.map((p, i) => {
    const key = `handle-cut#p1_${i}`;
    return {
      ...p,
      x: pose[`${key}|x`] ?? p.x,
      y: pose[`${key}|y`] ?? p.y,
      cubic: { ...p.cubic, distance: pose[`${key}|distance`] ?? p.cubic.distance },
    };
  });
  return pathData(points, true);
}

const stopMarkup = (stops) =>
  stops
    .map((s) => {
      const { hex, opacity } = splitColor(s.color);
      return `      <stop offset="${s.position}" stop-color="${hex}" stop-opacity="${opacity}" />`;
    })
    .join("\n");

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
${Object.entries(LIGHTING)
  .map(
    ([key, field]) => `    <radialGradient id="light-${key}" cx="${r(field.center.x)}" cy="${r(field.center.y)}" r="${r(field.radius)}" gradientUnits="userSpaceOnUse">
${stopMarkup(field.stops)}
    </radialGradient>`,
  )
  .join("\n")}
    <clipPath id="bodyMask">
      <path d="${bodyPath}" />
    </clipPath>
  </defs>`;

// Grain: one stroked path per bucket, each holding many two-point subpaths.
// Generated from the same seeds as the Rive scene, so the two stay identical.
// Grain is ~14k two-point dashes, so its path data dominates the file. Writing
// them as relative moves with trimmed leading zeros keeps the SVG openable in a
// design tool without changing a single coordinate.
const compact = (v) => {
  const t = Number(v.toFixed(2)).toString();
  return t.startsWith("0.") ? t.slice(1) : t.startsWith("-0.") ? `-${t.slice(2)}` : t;
};

const grainMarkup = (specks, indent) =>
  bucketSpecks(specks)
    .map((bucket) => {
      const d = bucket.subpaths
        .map((sp) => {
          const [a, b] = sp.points;
          return `M${compact(a.x)},${compact(a.y)}l${compact(b.x - a.x)},${compact(b.y - a.y)}`;
        })
        .join("");
      const color = bucket.light ? COLOR.grainLight : COLOR.grainDark;
      return `${indent}<path fill="none" stroke="${color}" stroke-width="${bucket.thickness}" stroke-linecap="round" opacity="${bucket.opacity}" d="${d}" />`;
    })
    .join("\n");

const eyeMarkup = (side, sign) => {
  const variant = EYE_VARIANTS[0];
  return `        <g id="eye-${side}" transform="translate(${sign * 36} 0)">
          <rect x="${-variant.width / 2}" y="${-variant.height / 2}" width="${variant.width}" height="${variant.height}" rx="${variant.cornerRadius}" fill="${COLOR.eye}" />
        </g>`;
};

// Form lighting and edge light, fixed to the key light: in the rig these sit on
// BodyPlate outside the turning panels, so they squeeze but never slide.
const lightingMarkup = [
  ...["falloff", "keyLift", "bounce", "rim"].map((key) => {
    const { center, radius } = LIGHTING[key];
    return `        <circle id="light-${key}-field" cx="${r(center.x)}" cy="${r(center.y)}" r="${r(radius)}" fill="url(#light-${key})" />`;
  }),
  ...BODY_EDGE_RUNS.map(
    (run) =>
      `        <path d="${pathData(run, false)}" fill="none" stroke="${COLOR.rim}" stroke-width="${EDGE_LIGHT.body.thickness}" stroke-linecap="round" stroke-linejoin="round" opacity="${EDGE_LIGHT.opacity}" />`,
  ),
].join("\n");

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
${lightingMarkup}
      </g>`;

// The handle as the rig draws it (scene.mjs): the near face on HandleFace, the
// far face's copy on WallFar and the band between their tops on HandleBridge,
// the window cut from all three, and the tints the turn keys from the light.
const handleLayers = (pose, { id = "", grain = false } = {}) => {
  const at = (x, scale) => `translate(${r(x)} 0) scale(${r(scale)} 1)`;
  const face = at(pose["HandleFace|x"], pose["HandleFace|scaleX"]);
  const far = at(pose["WallFar|x"], pose["WallFar|scaleX"]);
  const farEdge = at(pose["WallFarEdge|x"], pose["WallFarEdge|scaleX"]);
  const bridge = at(0, pose["HandleBridge|scaleX"]);
  const detail = r(pose["HandleFaceDetail|opacity"]);
  const outer = pathData(HANDLE_OUTER, true);
  const half = pathData(HANDLE_HALF, true);
  const band = pathData(HANDLE_BRIDGE, true);
  const tint = (d, color, key) => `<path d="${d}" fill="${color}" opacity="${r(pose[`${key}|opacity`])}" />`;
  const strokes = (runs) =>
    runs
      .map(
        (run) =>
          `<path d="${pathData(run, false)}" fill="none" stroke="${COLOR.rim}" stroke-width="${EDGE_LIGHT.handle.thickness}" stroke-linecap="round" stroke-linejoin="round" opacity="${EDGE_LIGHT.opacity}" />`,
      )
      .join("\n          ");
  const speckled = (clip, transform, include, exclude, options) =>
    grain
      ? `
      <g clip-path="url(#${clip}${id})">
        <g transform="${transform}">
${grainMarkup(scatterGrain({ include, exclude, luma: handleLuma, ...options }), "          ")}
        </g>
      </g>`
      : "";
  return `<g id="handle" transform="translate(0 ${HANDLE_CY})">
      <clipPath id="cut${id}"><path clip-rule="evenodd" d="M -320 -220 H 320 V 220 H -320 Z ${windowPath(pose)}" /></clipPath>
      <clipPath id="face${id}"><path transform="${face}" clip-rule="evenodd" d="${handlePath}" /></clipPath>
      <clipPath id="farHalf${id}"><path transform="${far}" d="${half}" /></clipPath>
      <clipPath id="band${id}"><path transform="${bridge}" d="${band}" /></clipPath>
      <g id="handle-walls" clip-path="url(#cut${id})">
        <path id="wall-far" transform="${far}" d="${outer}" fill="url(#handleFill)" />
        <path id="wall-near" transform="${face}" d="${outer}" fill="url(#handleFill)" />
        <path id="wall-bridge" transform="${bridge}" d="${band}" fill="url(#handleFill)" />
        <g transform="${far}">${tint(half, COLOR.grainDark, "wall-far-shade")}${tint(half, COLOR.lift, "wall-far-lift")}</g>
        <g transform="${bridge}">${tint(band, COLOR.grainDark, "wall-bridge-shade")}${tint(band, COLOR.lift, "wall-bridge-lift")}</g>
      </g>
      <g clip-path="url(#farHalf${id})">
        <g transform="${farEdge}">
          ${strokes(HANDLE_EDGE_RUNS)}
        </g>
      </g>
      <g clip-path="url(#band${id})">
        <g transform="${bridge}">
          ${strokes(BRIDGE_EDGE_RUNS)}
        </g>
      </g>${speckled("cut", far, [HANDLE_OUTER], [], GRAIN.handle)}${speckled("cut", bridge, [HANDLE_BRIDGE], [], GRAIN.handleBridge)}
      <g id="handle-near-face">
        <g transform="${face}">
          <path id="handle-face" fill-rule="evenodd" d="${handlePath}" fill="url(#handleFill)" />
          <g opacity="${detail}">
            ${tint(handlePath, COLOR.grainDark, "handle-face-shade").replace("<path", '<path fill-rule="evenodd"')}
            ${tint(handlePath, COLOR.lift, "handle-face-lift").replace("<path", '<path fill-rule="evenodd"')}
          </g>
        </g>${speckled("face", face, [HANDLE_OUTER], [HANDLE_HOLE], GRAIN.handleFace)}
        <g opacity="${detail}">
          <g clip-path="url(#cut${id})">
            <path id="handle-inner" transform="${face}" d="${pathData(HANDLE_HOLE, true)}" fill="${COLOR.grainDark}" opacity="${HANDLE_SHADING.inner}" />
          </g>
          <g clip-path="url(#face${id})">
            <g transform="${face}">
          ${strokes(HANDLE_EDGE_RUNS)}
            </g>
          </g>
        </g>
      </g>
    </g>`;
};

const front = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none" role="img" aria-labelledby="title description">
  <title id="title">Kettlebell Bot</title>
  <desc id="description">A charcoal kettlebell-shaped assistant with a real handle opening, soft form shading and two vertical off-white eyes.</desc>
${gradients}

  <!-- Group and shape ids mirror the Rive rig in rive/kettlebell-bot.scene.json. -->
  <g id="kettlebell-bot" transform="translate(${ROOT_X} ${ROOT_Y}) scale(${ROOT_SCALE})">
    ${handleLayers(turnPose(0), { grain: true })}

    <g id="body">
      <path id="body-core" d="${bodyPath}" fill="url(#bodyFill)" />
${depthLayers()}
      <g id="body-grain" clip-path="url(#bodyMask)">
${grainMarkup(scatterGrain({ include: [BODY_POINTS], luma: bodyLuma, ...GRAIN.body }), "        ")}
      </g>
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
// Grain is left out here on purpose: this sheet is a reference diagram for the
// facing model, and seven copies of the speck field would bury it.
// ---------------------------------------------------------------------------
const FACINGS = [0, 60, 120, 180, 240, 300, 360];
const CELL = 380;
const sheetWidth = FACINGS.length * CELL;

const cell = (deg, index) => {
  const pose = turnPose(deg);
  const eye = (side) => {
    const sign = side === "L" ? "L" : "R";
    const opacity = pose[`Eye${sign}|opacity`];
    if (opacity <= 0.005) return "";
    return `        <g transform="translate(${r(pose[`Eye${sign}|x`])} 0) scale(${r(pose[`Eye${sign}|scaleX`])} 1)" opacity="${r(opacity)}">
          <rect x="-12" y="-31" width="24" height="62" rx="12" fill="${COLOR.eye}" />
        </g>`;
  };
  // The eyes are clipped to this cell's own squeezed body, exactly as FaceRoot
  // is clipped to body-mask in the rig. Without it the sheet would show an eye
  // overhanging the outline near profile while the .riv does not.
  const squeeze = r(pose["BodyPlate|scaleX"]);
  return `  <g id="facing-${deg}" transform="translate(${index * CELL + CELL / 2} 300) scale(0.78)">
    <clipPath id="cellMask-${deg}">
      <path transform="scale(${squeeze} 1)" d="${bodyPath}" />
    </clipPath>
    ${handleLayers(pose, { id: `-${deg}` })}
    <g transform="scale(${squeeze} 1)">
      <path d="${bodyPath}" fill="url(#bodyFill)" />
${depthLayers(pose)}
    </g>
    <g clip-path="url(#cellMask-${deg})">
      <g transform="translate(0 ${EYE_Y})">
${eye("L")}
${eye("R")}
      </g>
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
