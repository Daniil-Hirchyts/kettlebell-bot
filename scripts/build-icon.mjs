#!/usr/bin/env node
//
// App-icon artwork: the bot in a held three-quarter pose, close up and cropped
// by the icon frame.
//
//   node scripts/build-icon.mjs
//   node scripts/build-icon.mjs --pose -34,16,-6 --out /tmp/try   # explore a pose
//
// Writes into assets/icon/, every file on a transparent 1024 canvas:
//   kettlebell-bot-icon.svg        cropped by the icon frame (vector master)
//   kettlebell-bot-icon-grain.svg  the same with film grain
//   kettlebell-bot-pose.svg        the same pose, whole character, uncropped
//
// The turnaround rig only yaws, which is all a turn needs. A pose that looks up
// and past the viewer also pitches, and a pitched kettlebell cannot be faked
// with 2D squeezes, so this builds the solid the rig describes and projects it:
// the bell is the body of revolution under BODY_POINTS with the
// BELL_DEPTH_RATIO cross-section, the handle is a HANDLE_DEPTH plate, and the
// eyes are decals on the bell's own surface. Facing 0, pitch 0 reproduces the
// front-view silhouette exactly.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  BELL_DEPTH_RATIO,
  BODY_BOTTOM,
  BODY_TOP,
  COLOR,
  EYE_SEPARATION,
  EYE_VARIANTS,
  EYE_Y,
  FIELD,
  HANDLE_CY,
  HANDLE_DEPTH,
  HANDLE_HOLE,
  HANDLE_OUTER,
  KEY_LIGHT,
  bodyHalfWidthAt,
  parseColor,
} from "./lib/geometry.mjs";
import { bucketSpecks, flattenContour, scatterGrain } from "./lib/grain.mjs";
import { compoundPathData, splitColor } from "./lib/svg.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const { values: args } = parseArgs({
  options: { pose: { type: "string" }, frame: { type: "string" }, out: { type: "string" } },
});
const csv = (value) => value.split(",").map(Number);

const DEG = Math.PI / 180;
const SIZE = 1024;

// facing uses the rig's convention (scripts/lib/turn.mjs): negative turns the
// face toward the right edge of the screen. pitch > 0 looks up, so the top of
// the bell tips away. roll is a picture-plane tilt, positive clockwise.
const POSE = args.pose
  ? Object.fromEntries(csv(args.pose).map((v, i) => [["facing", "pitch", "roll"][i], v]))
  : { facing: -32, pitch: 15, roll: -8 };

// Icon framing: px per character unit, and where the midpoint between the two
// eyes lands, as a fraction of the canvas.
const ICON_FRAME = args.frame
  ? (([scale, ex, ey]) => ({ scale, eyes: [ex, ey] }))(csv(args.frame))
  : { scale: 2.75, eyes: [0.6, 0.58] };

// The rig's own key light (geometry.mjs), so the icon and the animation are lit
// from the same place.
const LIGHT = KEY_LIGHT;

const D = BELL_DEPTH_RATIO;
const HALF_DEPTH = HANDLE_DEPTH / 2;

// ---------------------------------------------------------------------------
// Small vector kit
// ---------------------------------------------------------------------------
function normalize(v) {
  const l = Math.hypot(...v) || 1;
  return v.map((c) => c / l);
}
const dot = (a, b) => a.reduce((s, c, i) => s + c * b[i], 0);
const cross2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const f = (v) => Number(v.toFixed(2));
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

function rotor({ facing, pitch, roll }) {
  const [ca, sa] = [Math.cos(facing * DEG), Math.sin(facing * DEG)];
  const [cb, sb] = [Math.cos(pitch * DEG), Math.sin(pitch * DEG)];
  const [cc, sc] = [Math.cos(roll * DEG), Math.sin(roll * DEG)];
  return ([x, y, z]) => {
    // Yaw about the bell's own axis, identical to turn.mjs...
    const x1 = x * ca - z * sa;
    const z1 = x * sa + z * ca;
    // ...then pitch about the screen's horizontal axis...
    const y2 = y * cb - z1 * sb;
    const z2 = y * sb + z1 * cb;
    // ...then roll in the picture plane.
    return [x1 * cc - y2 * sc, x1 * sc + y2 * cc, z2];
  };
}

/** Monotone-chain convex hull of 2D points. */
function hull(points) {
  const pts = points.map((p) => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross2(out.at(-2), out.at(-1), p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(pts), ...half(pts.reverse())];
}

/** Evenly respace a closed polygon, so a hull's clustered vertices smooth cleanly. */
function resample(poly, count) {
  const n = poly.length;
  const lengths = poly.map((p, i) => Math.hypot(poly[(i + 1) % n][0] - p[0], poly[(i + 1) % n][1] - p[1]));
  const total = lengths.reduce((s, l) => s + l, 0);
  const out = [];
  let seg = 0;
  let walked = 0;
  for (let k = 0; k < count; k += 1) {
    const at = (k / count) * total;
    while (walked + lengths[seg] < at) walked += lengths[seg++];
    const t = (at - walked) / (lengths[seg] || 1);
    const a = poly[seg];
    const b = poly[(seg + 1) % n];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** Closed Catmull-Rom spline through the points, written as cubic Béziers. */
function smoothPath(poly) {
  const n = poly.length;
  const P = (i) => poly[(i + n) % n];
  const parts = [`M ${pt(P(0))}`];
  for (let i = 0; i < n; i += 1) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    parts.push(`C ${pt(c1)} ${pt(c2)} ${pt(p2)}`);
  }
  return `${parts.join(" ")} Z`;
}

const polygonPath = (poly) => `M ${poly.map(pt).join(" L ")} Z`;

/** Sutherland–Hodgman: clip a polygon by a convex one. */
function clipConvex(subject, clip) {
  let area = 0;
  for (let i = 0; i < clip.length; i += 1) {
    const [a, b] = [clip[i], clip[(i + 1) % clip.length]];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const side = Math.sign(area);
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i += 1) {
    const [a, b] = [clip[i], clip[(i + 1) % clip.length]];
    const inside = (p) => side * cross2(a, b, p) >= 0;
    const cut = (p, q) => {
      const dp = cross2(a, b, p);
      const t = dp / (dp - cross2(a, b, q));
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    };
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j += 1) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) {
        out.push(cut(prev, cur));
      }
    }
  }
  return out;
}

const extreme = (poly, dir, sign = 1) =>
  poly.reduce((best, p) => (sign * dot(p, dir) > sign * dot(best, dir) ? p : best));

// ---------------------------------------------------------------------------
// The posed solid, in view units (character units after rotation)
// ---------------------------------------------------------------------------
function buildPose(pose) {
  const rotate = rotor(pose);

  // --- bell ----------------------------------------------------------------
  // Surface point at height y and azimuth t: (w sin t, y, D w cos t). Its normal
  // is the gradient of x²/w² + z²/(D w)² - 1, which on the surface reduces to
  // (sin t, -w'(y), cos t / D).
  const slope = (y) => {
    const h = 0.5;
    const a = Math.max(BODY_TOP, y - h);
    const b = Math.min(BODY_BOTTOM, y + h);
    return Math.max(-40, Math.min(40, (bodyHalfWidthAt(b) - bodyHalfWidthAt(a)) / (b - a)));
  };
  const samples = [];
  for (let i = 0; i <= 220; i += 1) {
    const y = BODY_TOP + ((BODY_BOTTOM - BODY_TOP) * i) / 220;
    const w = bodyHalfWidthAt(y);
    const dw = slope(y);
    for (let j = 0; j < 240; j += 1) {
      const t = (j / 240) * 2 * Math.PI;
      samples.push({
        p: rotate([w * Math.sin(t), y, D * w * Math.cos(t)]),
        n: normalize(rotate([Math.sin(t), -dw, Math.cos(t) / D])),
      });
    }
  }
  // The solid is convex, so its silhouette is the hull of its projection.
  const body = resample(hull(samples.map((s) => s.p)), 360);

  // Where the key light lands squarest, and where it falls off hardest, among
  // the points that face the viewer. Every shading field is anchored to these.
  const facing = samples.filter((s) => s.n[2] > 0.15);
  const lit = facing.reduce((a, b) => (dot(b.n, LIGHT) > dot(a.n, LIGHT) ? b : a)).p;
  const dark = facing.reduce((a, b) => (dot(b.n, LIGHT) < dot(a.n, LIGHT) ? b : a)).p;

  const bellPoint = (y, t) => {
    const w = bodyHalfWidthAt(y);
    return rotate([w * Math.sin(t), y, D * w * Math.cos(t)]);
  };

  // --- eyes: decals on the bell's surface -----------------------------------
  // Each eye keeps its resting centre line at x = ±EYE_SEPARATION/2 in the
  // front view and wraps by arc length around the bell at every height, so it
  // bends with the real form and foreshortens along whichever way the surface
  // is turning away.
  const pill = EYE_VARIANTS[0];
  const outline = roundedRect(pill.width, pill.height, pill.cornerRadius);
  const eye = (side) =>
    outline.map(([u, v]) => {
      const y = EYE_Y + v;
      const w = bodyHalfWidthAt(y);
      return bellPoint(y, side * Math.asin(EYE_SEPARATION / 2 / w) + u / w);
    });
  const eyes = [eye(-1), eye(1)];

  // --- handle: a flat plate HANDLE_DEPTH thick ------------------------------
  // A plane maps to the screen affinely, so each face is the authored path
  // under one matrix — exact, no resampling. The visible walls are the hull of
  // front and back outlines, minus the see-through part of the opening.
  const ex = rotate([1, 0, 0]);
  const ey = rotate([0, 1, 0]);
  const ez = rotate([0, 0, 1]);
  const origin = rotate([0, HANDLE_CY, 0]);
  const near = ez[2] >= 0 ? HALF_DEPTH : -HALF_DEPTH;
  const onPlane = (z) => ([hx, hy]) => [
    origin[0] + hx * ex[0] + hy * ey[0] + z * ez[0],
    origin[1] + hx * ex[1] + hy * ey[1] + z * ez[1],
  ];
  const outer = flattenContour(HANDLE_OUTER, 32);
  const hole = flattenContour(HANDLE_HOLE, 32);
  const handle = {
    matrix: [ex[0], ex[1], ey[0], ey[1], ...onPlane(near)([0, 0])],
    walls: resample(hull([...outer.map(onPlane(near)), ...outer.map(onPlane(-near))]), 240),
    frontOuter: outer.map(onPlane(near)),
    frontHole: hole.map(onPlane(near)),
    seeThrough: clipConvex(hole.map(onPlane(near)), hole.map(onPlane(-near))),
  };

  return {
    body,
    eyes,
    handle,
    lit,
    dark,
    up: [rotate([0, BODY_TOP, 0]), rotate([0, BODY_BOTTOM, 0])],
    crown: rotate([0, BODY_TOP + 14, 0]),
    front: bellPoint(-42, 0),
  };
}

/** A rounded rectangle centred on the origin, as a dense clockwise polyline. */
function roundedRect(width, height, radius) {
  const hx = width / 2 - radius;
  const hy = height / 2 - radius;
  const corners = [
    [hx, -hy, -90],
    [hx, hy, 0],
    [-hx, hy, 90],
    [-hx, -hy, 180],
  ];
  const out = [];
  corners.forEach(([cx, cy, start], i) => {
    for (let k = 0; k < 20; k += 1) {
      const a = (start + (90 * k) / 20) * DEG;
      out.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
    // The straight runs bend once they are wrapped onto the bell, so they need
    // points along them too.
    const [nx, ny, nStart] = corners[(i + 1) % 4];
    const a = (start + 90) * DEG;
    const from = [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
    const b = nStart * DEG;
    const to = [nx + radius * Math.cos(b), ny + radius * Math.sin(b)];
    for (let k = 0; k < 24; k += 1) {
      out.push([from[0] + ((to[0] - from[0]) * k) / 24, from[1] + ((to[1] - from[1]) * k) / 24]);
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Grain, in canvas pixels. The rig's grain is sized for a 512 artboard; at icon
// scale the same specks would be 3-7 px long, so this one is laid out in the
// frame the icon is actually seen at.
// ---------------------------------------------------------------------------
const ICON_GRAIN = {
  body: { seed: 20260911, density: 90, lumaRange: [0.06, 0.22], delta: 0.05, length: [0.9, 2.4], thickness: [0.9, 1.7] },
  handle: { seed: 20260912, density: 90, lumaRange: [0.07, 0.18], delta: 0.045, length: [0.9, 2.2], thickness: [0.9, 1.6] },
};

const compact = (v) => {
  const t = Number(v.toFixed(2)).toString();
  return t.startsWith("0.") ? t.slice(1) : t.startsWith("-0.") ? `-${t.slice(2)}` : t;
};

const grainMarkup = (specks, indent) =>
  bucketSpecks(specks)
    .map((bucket) => {
      const d = bucket.subpaths
        .map(({ points: [a, b] }) => `M${compact(a.x)},${compact(a.y)}l${compact(b.x - a.x)},${compact(b.y - a.y)}`)
        .join("");
      const color = bucket.light ? COLOR.grainLight : COLOR.grainDark;
      return `${indent}<path fill="none" stroke="${color}" stroke-width="${bucket.thickness}" stroke-linecap="round" opacity="${bucket.opacity}" d="${d}" />`;
    })
    .join("\n");

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------
const stops = (list) =>
  list
    .map((s) => {
      const { hex, opacity } = splitColor(s.color);
      return `<stop offset="${s.position}" stop-color="${hex}" stop-opacity="${opacity}" />`;
    })
    .join("");

function render(pose, frame, { grain = false, crop = true } = {}) {
  const { body, eyes, handle, lit, dark, up, crown, front } = pose;
  const S = frame.scale;
  const toCanvas = ([x, y]) => [frame.x + S * x, frame.y + S * y];
  const toView = ([x, y]) => [(x - frame.x) / S, (y - frame.y) / S];

  const light2 = normalize(LIGHT.slice(0, 2));
  const bodyPath = smoothPath(body);
  const center = body.reduce((a, p) => [a[0] + p[0] / body.length, a[1] + p[1] / body.length], [0, 0]);
  const litEdge = extreme(body, light2);
  const darkEdge = extreme(body, light2, -1);
  const handleLitEdge = extreme(handle.walls, light2);
  const handleDarkEdge = extreme(handle.walls, light2, -1);
  const mixPoint = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const handleShape = compoundPathData([
    { closed: true, points: HANDLE_OUTER },
    { closed: true, points: HANDLE_HOLE },
  ]);
  const frontOuterPath = compoundPathData([{ closed: true, points: HANDLE_OUTER }]);

  let grainLayers = { body: "", handle: "" };
  if (grain) {
    // Scatter in canvas pixels, over only the part of each form the frame shows.
    const canvas = [[0, 0], [SIZE, 0], [SIZE, SIZE], [0, SIZE]];
    const region = (poly) => (crop ? clipConvex(poly.map(toCanvas), canvas) : poly.map(toCanvas));
    const asContour = (poly) => poly.map(([x, y]) => ({ x, y }));
    const upDir = normalize([up[1][0] - up[0][0], up[1][1] - up[0][1]]);
    const upLen = Math.hypot(up[1][0] - up[0][0], up[1][1] - up[0][1]);
    const topLuma = parseColor(COLOR.bodyTop).luma;
    const bottomLuma = parseColor(COLOR.bodyBottom).luma;
    // Rough luminance of the shading below, enough to scale each speck.
    const luma = (cx, cy) => {
      const [x, y] = toView([cx, cy]);
      const t = Math.min(1, Math.max(0, dot([x - up[0][0], y - up[0][1]], upDir) / upLen));
      const base = topLuma + (bottomLuma - topLuma) * t;
      const lift = Math.exp(-((Math.hypot(x - lit[0], y - lit[1]) / 120) ** 2));
      return base + 0.1 * lift;
    };
    const grainFor = (poly, holes, options) =>
      scatterGrain({
        include: [asContour(region(poly))],
        exclude: holes.map((h) => asContour(region(h))),
        luma,
        deltaGain: [0.62, 1.5],
        deltaJitter: [0.55, 1.45],
        maxAlphaLight: 0.3,
        maxAlphaDark: 0.55,
        ...options,
      });
    grainLayers = {
      body: grainMarkup(grainFor(body, [], ICON_GRAIN.body), "      "),
      handle: grainMarkup(grainFor(handle.walls, [handle.seeThrough], ICON_GRAIN.handle), "      "),
    };
  }

  const view = `translate(${f(frame.x)} ${f(frame.y)}) scale(${f(S)})`;
  const canvasBox = `x="${f(-frame.x / S)}" y="${f(-frame.y / S)}" width="${f(SIZE / S)}" height="${f(SIZE / S)}"`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none" role="img" aria-labelledby="title">
  <title id="title">Kettlebell Bot</title>
  <!-- Generated by scripts/build-icon.mjs — pose: facing ${POSE.facing}, pitch ${POSE.pitch}, roll ${POSE.roll}. -->
  <defs>
    <clipPath id="canvas"><rect width="${SIZE}" height="${SIZE}" /></clipPath>
    <clipPath id="bodyClip"><path d="${bodyPath}" /></clipPath>
    <filter id="soft" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="3.2" /></filter>
    <filter id="softer" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="7" /></filter>

    <linearGradient id="bodyFill" gradientUnits="userSpaceOnUse" x1="${f(up[0][0])}" y1="${f(up[0][1])}" x2="${f(up[1][0])}" y2="${f(up[1][1])}">
      <stop offset="0" stop-color="${COLOR.bodyTop}" /><stop offset="1" stop-color="${COLOR.bodyBottom}" />
    </linearGradient>
    <radialGradient id="keyLift" gradientUnits="userSpaceOnUse" cx="${f(lit[0])}" cy="${f(lit[1])}" r="150">
      <stop offset="0" stop-color="#E8ECF4" stop-opacity="0.11" /><stop offset="0.45" stop-color="#E8ECF4" stop-opacity="0.045" /><stop offset="1" stop-color="#E8ECF4" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="falloff" gradientUnits="userSpaceOnUse" cx="${f(dark[0])}" cy="${f(dark[1])}" r="210">
      <stop offset="0" stop-color="${COLOR.grainDark}" stop-opacity="0.62" /><stop offset="0.5" stop-color="${COLOR.grainDark}" stop-opacity="0.22" /><stop offset="1" stop-color="${COLOR.grainDark}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="crownShade" gradientUnits="userSpaceOnUse" cx="${f(crown[0])}" cy="${f(crown[1])}" r="74">${stops(FIELD.topShade)}</radialGradient>
    <radialGradient id="frontField" gradientUnits="userSpaceOnUse" cx="${f(front[0])}" cy="${f(front[1])}" r="126">${stops(FIELD.front)}</radialGradient>

    <linearGradient id="rimFade" gradientUnits="userSpaceOnUse" x1="${f(litEdge[0])}" y1="${f(litEdge[1])}" x2="${f(center[0])}" y2="${f(center[1])}">
      <stop offset="0" stop-color="#FFFFFF" /><stop offset="0.55" stop-color="#000000" />
    </linearGradient>
    <mask id="rimMask" maskUnits="userSpaceOnUse" ${canvasBox}><rect ${canvasBox} fill="url(#rimFade)" /></mask>
    <linearGradient id="bounceFade" gradientUnits="userSpaceOnUse" x1="${f(darkEdge[0])}" y1="${f(darkEdge[1])}" x2="${f(center[0])}" y2="${f(center[1])}">
      <stop offset="0" stop-color="#FFFFFF" /><stop offset="0.4" stop-color="#000000" />
    </linearGradient>
    <mask id="bounceMask" maskUnits="userSpaceOnUse" ${canvasBox}><rect ${canvasBox} fill="url(#bounceFade)" /></mask>

    <linearGradient id="handleFront" gradientUnits="userSpaceOnUse" x1="0" y1="-78" x2="0" y2="78">
      <stop offset="0" stop-color="${COLOR.handleTop}" /><stop offset="1" stop-color="${COLOR.handleBottom}" />
    </linearGradient>
    <linearGradient id="handleWalls" gradientUnits="userSpaceOnUse" x1="${f(handleLitEdge[0])}" y1="${f(handleLitEdge[1])}" x2="${f(handleDarkEdge[0])}" y2="${f(handleDarkEdge[1])}">
      <stop offset="0" stop-color="#343842" /><stop offset="0.5" stop-color="#1A1D23" /><stop offset="1" stop-color="#0E1014" />
    </linearGradient>
    <linearGradient id="handleRimFade" gradientUnits="userSpaceOnUse" x1="${f(handleLitEdge[0])}" y1="${f(handleLitEdge[1])}" x2="${f(mixPoint(handleLitEdge, handleDarkEdge, 1)[0])}" y2="${f(mixPoint(handleLitEdge, handleDarkEdge, 1)[1])}">
      <stop offset="0" stop-color="#FFFFFF" /><stop offset="0.5" stop-color="#000000" />
    </linearGradient>
    <mask id="handleRimMask" maskUnits="userSpaceOnUse" ${canvasBox}><rect ${canvasBox} fill="url(#handleRimFade)" /></mask>
    <clipPath id="handleClip"><path d="${smoothPath(handle.walls)} ${polygonPath(handle.seeThrough)}" clip-rule="evenodd" /></clipPath>
  </defs>

  <g id="kettlebell-bot"${crop ? ' clip-path="url(#canvas)"' : ""}>
    <g transform="${view}">
      <g id="handle">
        <path id="handle-walls" fill-rule="evenodd" d="${smoothPath(handle.walls)} ${polygonPath(handle.seeThrough)}" fill="url(#handleWalls)" />
        <path id="handle-inner-wall" fill-rule="evenodd" d="${polygonPath(handle.frontHole)} ${polygonPath(handle.seeThrough)}" fill="${COLOR.grainDark}" opacity="0.45" />
        <path id="handle-face" fill-rule="evenodd" transform="matrix(${handle.matrix.map(f).join(" ")})" d="${handleShape}" fill="url(#handleFront)" />
        <g clip-path="url(#handleClip)" mask="url(#handleRimMask)">
          <path d="${smoothPath(handle.walls)}" stroke="${COLOR.rim}" stroke-width="10" opacity="0.5" filter="url(#soft)" />
          <path transform="matrix(${handle.matrix.map(f).join(" ")})" d="${frontOuterPath}" stroke="#B9BCC4" stroke-width="2.2" opacity="0.55" />
        </g>
      </g>
      <g id="handle-grain" clip-path="url(#handleClip)">
        <g transform="scale(${f(1 / S)}) translate(${f(-frame.x)} ${f(-frame.y)})">
${grainLayers.handle}
        </g>
      </g>

      <g id="body">
        <path id="body-core" d="${bodyPath}" fill="url(#bodyFill)" />
        <g id="shading" clip-path="url(#bodyClip)">
          <path d="${bodyPath}" fill="url(#crownShade)" />
          <path d="${bodyPath}" fill="url(#falloff)" />
          <path d="${bodyPath}" fill="url(#keyLift)" />
          <path d="${bodyPath}" fill="url(#frontField)" />
          <path d="${bodyPath}" stroke="#5B6272" stroke-width="16" opacity="0.4" filter="url(#softer)" mask="url(#bounceMask)" />
          <g mask="url(#rimMask)">
            <path d="${bodyPath}" stroke="${COLOR.rim}" stroke-width="20" opacity="0.42" filter="url(#softer)" />
            <path d="${bodyPath}" stroke="#C9CCD3" stroke-width="3.2" opacity="0.5" />
          </g>
        </g>
        <g id="body-grain" clip-path="url(#bodyClip)">
          <g transform="scale(${f(1 / S)}) translate(${f(-frame.x)} ${f(-frame.y)})">
${grainLayers.body}
          </g>
        </g>
      </g>

      <g id="face" clip-path="url(#bodyClip)">
        <path id="eye-left" d="${smoothPath(eyes[0])}" fill="${COLOR.eye}" />
        <path id="eye-right" d="${smoothPath(eyes[1])}" fill="${COLOR.eye}" />
      </g>
    </g>
  </g>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Frames and output
// ---------------------------------------------------------------------------
const pose = buildPose(POSE);

const eyeMid = pose.eyes
  .flat()
  .reduce((a, p, _, all) => [a[0] + p[0] / all.length, a[1] + p[1] / all.length], [0, 0]);
const iconFrame = {
  scale: ICON_FRAME.scale,
  x: ICON_FRAME.eyes[0] * SIZE - ICON_FRAME.scale * eyeMid[0],
  y: ICON_FRAME.eyes[1] * SIZE - ICON_FRAME.scale * eyeMid[1],
};

// Whole character, centred with a margin.
const everything = [...pose.body, ...pose.handle.walls];
const xs = everything.map((p) => p[0]);
const ys = everything.map((p) => p[1]);
const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const fitScale = (SIZE * 0.86) / Math.max(maxX - minX, maxY - minY);
const poseFrame = {
  scale: fitScale,
  x: SIZE / 2 - fitScale * ((minX + maxX) / 2),
  y: SIZE / 2 - fitScale * ((minY + maxY) / 2),
};

const outDir = args.out ? resolve(args.out) : resolve(projectRoot, "assets/icon");
mkdirSync(outDir, { recursive: true });
const files = {
  "kettlebell-bot-icon.svg": render(pose, iconFrame),
  "kettlebell-bot-icon-grain.svg": render(pose, iconFrame, { grain: true }),
  "kettlebell-bot-pose.svg": render(pose, poseFrame, { crop: false }),
};
for (const [name, svg] of Object.entries(files)) {
  writeFileSync(resolve(outDir, name), svg);
  console.log(`wrote ${resolve(outDir, name)} (${(svg.length / 1024).toFixed(0)} KB)`);
}
