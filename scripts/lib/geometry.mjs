// Kettlebell Bot — vector geometry.
//
// Single source of truth for the character's artwork. Both the Rive scene
// (scripts/build-rive.mjs) and the editable SVG source (scripts/build-svg.mjs)
// are generated from this module, so the two can never drift apart.
//
// All coordinates are expressed in CHARACTER-LOCAL space: the origin (0, 0) is
// the body's optical mass centre. The artboard places that origin at ROOT_X/ROOT_Y.

export const ARTBOARD = { name: "KettlebellBot", width: 512, height: 512 };

// Character origin inside the artboard + a global downscale that reserves head
// room for jumps, spins and overshoot without clipping the 512 box.
export const ROOT_X = 256;
export const ROOT_Y = 302;
export const ROOT_SCALE = 0.92;

// ---------------------------------------------------------------------------
// Palette
//
// Brand colours are locked to the supplied reference (charcoal body, off-white
// eyes). Every supporting depth value is a tint/shade step around that brand
// charcoal, and the rim light uses `palette.primary` from riv_design_tokens
// (seed #1B1D22, mood "tech", scheme "dark"). See specs/avatar-spec.md.
// ---------------------------------------------------------------------------
export const COLOR = {
  bodyTop: "#22252C",
  bodyBottom: "#15171B",
  handleTop: "#252932",
  handleBottom: "#171A20",
  facePlate: "#272B35",
  backPlate: "#131519",
  backDetail: "#2E323C",
  topShade: "#0C0E12",
  rim: "#9C9EA5",
  grainLight: "#FFFFFF",
  grainDark: "#05070B",
  eye: "#F8FAFC",
  invisible: "#00000000",
};

// ---------------------------------------------------------------------------
// Body silhouette — seven-anchor Bézier blob taken from the reference artwork.
// ---------------------------------------------------------------------------
export const BODY_POINTS = [
  { x: 0, y: -137.5, cubic: { rotation: 0, inRotation: 180, inDistance: 87, outDistance: 87 } },
  { x: 157, y: -59.5, cubic: { rotation: 70.7193, inRotation: -109.5923, inDistance: 62.6259, outDistance: 45.5412 } },
  { x: 150, y: 86.5, cubic: { rotation: 116.5651, inRotation: -63.9967, inDistance: 45.618, outDistance: 40.2492 } },
  { x: 48, y: 137.5, cubic: { rotation: 175.0303, inRotation: -3.8141, inDistance: 45.0999, outDistance: 23.0868 } },
  { x: -48, y: 137.5, cubic: { rotation: -176.1859, inRotation: 4.9697, inDistance: 23.0868, outDistance: 45.0999 } },
  { x: -150, y: 86.5, cubic: { rotation: -116.0033, inRotation: 63.4349, inDistance: 40.2492, outDistance: 45.618 } },
  { x: -157, y: -59.5, cubic: { rotation: -70.4077, inRotation: 109.2307, inDistance: 45.5412, outDistance: 62.6259 } },
];

export const BODY_HALF_WIDTH = 157;
export const BODY_TOP = -137.5;
export const BODY_BOTTOM = 137.5;

const DEG = Math.PI / 180;
const polar = (angle, distance) => [Math.cos(angle * DEG) * distance, Math.sin(angle * DEG) * distance];

function flattenOpenPath(points, steps = 40) {
  const out = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const [ox, oy] = polar(a.cubic.rotation, a.cubic.outDistance ?? a.cubic.distance ?? 0);
    const [ix, iy] = polar(
      b.cubic.inRotation ?? (b.cubic.rotation ?? 0) + 180,
      b.cubic.inDistance ?? b.cubic.distance ?? 0,
    );
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const u = 1 - t;
      out.push([
        u * u * u * a.x + 3 * u * u * t * (a.x + ox) + 3 * u * t * t * (b.x + ix) + t * t * t * b.x,
        u * u * u * a.y + 3 * u * u * t * (a.y + oy) + 3 * u * t * t * (b.y + iy) + t * t * t * b.y,
      ]);
    }
  }
  return out;
}

// Half-width of the body silhouette at a given height, measured off the real
// outline rather than off the anchor points (the curve bulges ~10 past its
// widest anchor). BELL_RADIUS_X is one reading of this, and the build guard in
// validate.mjs uses it to prove the eye path never leaves the form.
const BODY_POLYLINE = flattenOpenPath([...BODY_POINTS, BODY_POINTS[0]], 96);

export function bodyHalfWidthAt(y) {
  let best = 0;
  for (let i = 1; i < BODY_POLYLINE.length; i += 1) {
    const [x0, y0] = BODY_POLYLINE[i - 1];
    const [x1, y1] = BODY_POLYLINE[i];
    if ((y0 - y) * (y1 - y) > 0) continue; // segment does not straddle this height
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    best = Math.max(best, Math.abs(x0 + (x1 - x0) * t));
  }
  return best;
}

// ---------------------------------------------------------------------------
// Handle — compound path (outer arch + real negative-space opening).
// Local to the handle's own centre, which sits at HANDLE_CY in character space.
// ---------------------------------------------------------------------------
export const HANDLE_CY = -169.5;

export const HANDLE_OUTER = [
  { x: 0, y: -76, cubic: { rotation: 0, inRotation: 180, inDistance: 70, outDistance: 70 } },
  { x: 122, y: -26, cubic: { rotation: 67.6199, inRotation: -112.6199, inDistance: 39, outDistance: 36.7696 } },
  { x: 104, y: 76, cubic: { rotation: 180, inRotation: -53.9726, inDistance: 40.8044, outDistance: 69.3333 } },
  { x: -104, y: 76, cubic: { rotation: -126.0274, inRotation: 0, inDistance: 69.3333, outDistance: 40.8044 } },
  { x: -122, y: -26, cubic: { rotation: -67.3801, inRotation: 112.3801, inDistance: 36.7696, outDistance: 39 } },
];

export const HANDLE_HOLE = [
  // Redesigned opening: every tangent is axis-aligned, so squashing the arch on
  // the X axis is an exact operation (two vertex X tracks + two horizontal
  // handle-length tracks) instead of a 20-track approximation. Traversal winds
  // opposite to the outer contour so the hole stays a real hole.
  { x: 0, y: -32, cubic: { rotation: 180, distance: 46 } },
  { x: -71, y: 10, cubic: { rotation: 90, distance: 32 } },
  { x: 0, y: 56, cubic: { rotation: 0, distance: 50 } },
  { x: 71, y: 10, cubic: { rotation: -90, distance: 32 } },
];

// Vertex handles for the hole, addressed as <shapeId>#p1_<index>.
export const HOLE_VERTEX = {
  top: 0,
  left: 1,
  bottom: 2,
  right: 3,
};
export const HOLE_SIDE_X = 71;
export const HOLE_TOP_HANDLE = 46;
export const HOLE_BOTTOM_HANDLE = 50;


// Physical dimensions the yaw model needs (see scripts/lib/turn.mjs).
export const HANDLE_OUTER_WIDTH = 244; // 2 * 122
export const HANDLE_HOLE_WIDTH = 142; // 2 * 71
export const HANDLE_DEPTH = 72; // front-to-back thickness of the arch plate

// ---------------------------------------------------------------------------
// Eye shape variants. Every variant is centred on (0, 0) so the solo swap never
// shifts the eye; expression comes from the surrounding transform chain.
// ---------------------------------------------------------------------------

const mirrorPoints = (points) =>
  points.map((p) => ({ ...p, x: -p.x })).reverse();

function arcPoints() {
  return [
    { x: -23, y: 9, radius: 3 },
    { x: 0, y: -13, cubic: { rotation: 0, inDistance: 15, outDistance: 15 } },
    { x: 23, y: 9, radius: 3 },
    { x: 0, y: 3, cubic: { rotation: 180, inDistance: 15, outDistance: 15 } },
  ];
}

function wedgePoints() {
  // Angled-top pill: the inner corner drops, reading as a lowered brow.
  return [
    { x: -12, y: -34, radius: 6 },
    { x: 12, y: -19, radius: 6 },
    { x: 12, y: 30, radius: 11 },
    { x: -12, y: 30, radius: 11 },
  ];
}

function starPoints() {
  const outerY = 27;
  const outerX = 19;
  const inner = 5.5;
  const d = inner * Math.SQRT1_2;
  return [
    { x: 0, y: -outerY, radius: 1.5 },
    { x: d, y: -d, radius: 3 },
    { x: outerX, y: 0, radius: 1.5 },
    { x: d, y: d, radius: 3 },
    { x: 0, y: outerY, radius: 1.5 },
    { x: -d, y: d, radius: 3 },
    { x: -outerX, y: 0, radius: 1.5 },
    { x: -d, y: -d, radius: 3 },
  ];
}

// One dial for how large the eyes read. Every variant is authored at its
// original size and scaled here, so the seven shapes keep their relationship to
// each other and a resize is a single number rather than 30 hand-edited
// coordinates. It is not free: the eyes are decals on the bell, and a taller
// eye reaches higher up the body where the bell has narrowed, which forces
// BELL_RADIUS_X down and pulls the eye back from the rim at profile. See the
// bell cross-section block below, which derives that radius from these shapes.
export const EYE_SCALE = 1.4;

const scaleVariant = (v) => {
  const s = EYE_SCALE;
  const scalePoints = (points) =>
    points.map((p) => ({
      ...p,
      x: p.x * s,
      y: p.y * s,
      ...(p.radius === undefined ? {} : { radius: p.radius * s }),
      ...(p.cubic === undefined
        ? {}
        : {
            cubic: {
              ...p.cubic,
              ...(p.cubic.distance === undefined ? {} : { distance: p.cubic.distance * s }),
              ...(p.cubic.inDistance === undefined ? {} : { inDistance: p.cubic.inDistance * s }),
              ...(p.cubic.outDistance === undefined ? {} : { outDistance: p.cubic.outDistance * s }),
            },
          }),
    }));
  return {
    ...v,
    ...(v.width === undefined ? {} : { width: v.width * s }),
    ...(v.height === undefined ? {} : { height: v.height * s }),
    ...(v.cornerRadius === undefined ? {} : { cornerRadius: v.cornerRadius * s }),
    ...(v.points === undefined ? {} : { points: scalePoints(v.points) }),
  };
};

// Ordered: the first entry is each eye's default solo child.
export const EYE_VARIANTS = [
  { key: "pill", kind: "rect", width: 24, height: 62, cornerRadius: 12 },
  { key: "tall", kind: "rect", width: 28, height: 76, cornerRadius: 14 },
  { key: "round", kind: "ellipse", width: 42, height: 42 },
  { key: "slit", kind: "rect", width: 34, height: 12, cornerRadius: 6 },
  { key: "arc", kind: "poly", points: arcPoints() },
  { key: "wedge", kind: "poly", points: wedgePoints(), mirrorable: true },
  { key: "star", kind: "poly", points: starPoints() },
].map(scaleVariant);

/** Half-extent of the largest eye on each axis, after EYE_SCALE. */
export const EYE_MAX_HALF = EYE_VARIANTS.reduce(
  (acc, v) => ({
    x: Math.max(acc.x, v.points ? Math.max(...v.points.map((p) => Math.abs(p.x))) : v.width / 2),
    y: Math.max(acc.y, v.points ? Math.max(...v.points.map((p) => Math.abs(p.y))) : v.height / 2),
  }),
  { x: 0, y: 0 },
);

export const EYE_DEFAULT_VARIANT = EYE_VARIANTS[0].key;

export function eyeShapeSpec(variant, id, parent, side, z) {
  const base = { id, parent, x: 0, y: 0, z, fill: { color: COLOR.eye } };
  if (variant.kind === "rect") {
    return { ...base, type: "rect", width: variant.width, height: variant.height, cornerRadius: variant.cornerRadius };
  }
  if (variant.kind === "ellipse") {
    return { ...base, type: "ellipse", width: variant.width, height: variant.height };
  }
  const points = variant.mirrorable && side === "R" ? mirrorPoints(variant.points) : variant.points;
  return { ...base, type: "polygon", closed: true, points };
}

// ---------------------------------------------------------------------------
// Bell cross-section — the one solid the whole turnaround is built on.
//
// Seen from above, the bell is a body of revolution flattened slightly
// front-to-back. At eye height its plan-view outline is an ellipse
// BELL_RADIUS_X across and BELL_RADIUS_X * BELL_DEPTH_RATIO deep. Both the
// silhouette squeeze and the eye path are projections of this same ellipse,
// which is what keeps an eye on the rim of the body at 90 degrees instead of
// floating somewhere inside it.
//
// BELL_RADIUS_X is measured, not chosen, and now measured by the module rather
// than by hand. It is NOT the half-width at eye height: the eye is a rigid
// shape and the bell keeps narrowing above eye height, so an eye riding the
// eye-height circle swings off the outline between about 45 and 75 degrees
// while its centre is still comfortably inside. An eye can only ride the
// smallest circle it spans, which is the one at the top of the tallest variant.
//
// Deriving it means EYE_SCALE and EYE_Y stay honest dials: enlarge the eyes and
// the radius follows on its own instead of quietly becoming wrong. The cost is
// visible in the same place — a taller eye reaches higher up a narrower part of
// the bell, so the radius shrinks and the eye sits a little further from the
// rim at profile. Validator rule 9 holds the floor on that.
// ---------------------------------------------------------------------------
export const EYE_Y = -24; // resting eye centre height in character space
export const BELL_RADIUS_X = bodyHalfWidthAt(EYE_Y - EYE_MAX_HALF.y);
export const BELL_DEPTH_RATIO = 0.95; // depth / width; drives the silhouette squeeze too
export const BELL_RADIUS_Z = BELL_RADIUS_X * BELL_DEPTH_RATIO;

// ---------------------------------------------------------------------------
// Eye rig constants
// ---------------------------------------------------------------------------
// The eyes are decals on that ellipse, so their radii are the bell's radii. The
// azimuth is then whatever keeps the resting pair EYE_SEPARATION apart, because
// the front-facing rest pose is the canonical look and must not move.
// Derived, never authored: whatever angle puts the resting pair exactly
// EYE_SEPARATION apart on the BELL_RADIUS_X circle. Quoting the resulting
// degrees here would only go stale the next time either input moves.
// Widened with the eyes, but deliberately by less than EYE_SCALE: the pair has
// to keep a gap between the two widest variants, while every extra unit of
// separation is an extra degree of azimuth, which pulls the eye back from the
// limb at profile. This is the balance point between those two.
export const EYE_SEPARATION = 84; // resting distance between eye centres
export const EYE_AZIMUTH = (Math.asin(EYE_SEPARATION / 2 / BELL_RADIUS_X) * 180) / Math.PI;


// ---------------------------------------------------------------------------
// Depth / turnaround planes
// ---------------------------------------------------------------------------
export const PLATE_RADIUS = 118; // how far the front/back panels swing while turning

// Rim light: the upper-left run of the real body outline, stroked thick and
// clipped to the silhouette so only the inner half survives as a crescent.

/**
 * Shorten a body-outline segment with de Casteljau, so the rim highlight ends
 * on the real silhouette instead of running blunt into the handle junction.
 */
function truncateSegment(from, to, t) {
  const [ox, oy] = polar(from.cubic.rotation, from.cubic.outDistance ?? from.cubic.distance);
  const [ix, iy] = polar(to.cubic.inRotation ?? from.cubic.rotation + 180, to.cubic.inDistance ?? to.cubic.distance);
  const p0 = [from.x, from.y];
  const c1 = [from.x + ox, from.y + oy];
  const c2 = [to.x + ix, to.y + iy];
  const p3 = [to.x, to.y];
  const mix = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = mix(p0, c1);
  const b = mix(c1, c2);
  const c = mix(c2, p3);
  const d = mix(a, b);
  const e = mix(b, c);
  const end = mix(d, e);
  const angle = (vx, vy) => Math.atan2(vy, vx) / DEG;
  const len = (vx, vy) => Math.hypot(vx, vy);
  return [
    {
      x: from.x,
      y: from.y,
      cubic: {
        rotation: angle(a[0] - p0[0], a[1] - p0[1]),
        inRotation: from.cubic.inRotation,
        inDistance: from.cubic.inDistance ?? 0,
        outDistance: len(a[0] - p0[0], a[1] - p0[1]),
      },
    },
    {
      x: end[0],
      y: end[1],
      cubic: {
        rotation: angle(e[0] - end[0], e[1] - end[1]) + 180,
        inRotation: angle(d[0] - end[0], d[1] - end[1]),
        inDistance: len(d[0] - end[0], d[1] - end[1]),
        outDistance: 0,
      },
    },
  ];
}

export const RIM_POINTS = truncateSegment(BODY_POINTS[6], BODY_POINTS[0], 0.7);

// Film grain. Vector specks, not a texture — see scripts/lib/grain.mjs for why.
// Seeds are fixed so the build stays byte-deterministic.
export const GRAIN = {
  // Two independent dials, and it is worth keeping them straight.
  //
  // `density` is specks per 1000 square px of covered area, and it sets how FINE
  // the grain is. It is the one that costs: measured on this artwork, density 140
  // is 14,432 specks and takes the file from 181 KB to 743 KB, so roughly 40 KB
  // and 1,030 specks per 10 points of density, and CPU rasterisation of a 256 px
  // frame from 0.9 ms to 7.3 ms. Grain wants to sit near one speck per device
  // pixel and that is far out of budget here, so this is chosen against the
  // budget rather than against the eye -- 140 is the shipped compromise, 70 halves
  // the cost and reads slightly coarser, and there is no visible ceiling, only a
  // price.
  //
  // `delta` is the target luminance deviation of a speck: how STRONG the grain
  // is, and it is free. Because the scatter is mean-preserving (see grain.mjs)
  // this can be moved without changing how light or dark the character reads.
  // `deltaGain` spreads it across the shading, so the lit shoulder and the rim
  // grain harder than the contact shadow.
  body: {
    seed: 20260904,
    density: 140,
    lumaRange: [0.09, 0.23],
    delta: 0.048,
    deltaGain: [0.62, 1.5],
    deltaJitter: [0.55, 1.45],
    length: [0.7, 2.0],
    thickness: [0.85, 1.6],
    maxAlphaLight: 0.3,
    maxAlphaDark: 0.55,
  },
  handle: {
    seed: 77010203,
    density: 140,
    lumaRange: [0.10, 0.16],
    delta: 0.043,
    deltaGain: [0.7, 1.35],
    deltaJitter: [0.55, 1.45],
    length: [0.7, 1.9],
    thickness: [0.85, 1.55],
    maxAlphaLight: 0.28,
    maxAlphaDark: 0.5,
  },
};


export const DEPTH_SHAPES = {
  topShade: { width: 320, height: 150, x: 0, y: -168 },
  // Front and back planes are soft radial fields, not panels: no hard edge can
  // give away that the "surface" is really a shape sliding across the body.
  facePlate: { width: 250, height: 214, x: 0, y: -28 },
  backPlate: { width: 250, height: 224, x: 0, y: -18 },
  backSeam: { width: 14, height: 124, x: 0, y: -34, cornerRadius: 7 },
  backVentA: { width: 92, height: 15, x: 0, y: 58, cornerRadius: 7.5 },
  backVentB: { width: 66, height: 15, x: 0, y: 86, cornerRadius: 7.5 },
};

// Soft-field gradients (#AARRGGBB): a light lift on the front plane, a dark
// sink on the back plane, both fading to fully transparent at the rim.
export const FIELD = {
  front: [
    { color: "#20FFFFFF", position: 0 },
    { color: "#12E8ECF4", position: 0.55 },
    { color: "#00E8ECF4", position: 1 },
  ],
  back: [
    { color: "#B005070B", position: 0 },
    { color: "#7405070B", position: 0.6 },
    { color: "#0005070B", position: 1 },
  ],
  // Contact shadow where the handle meets the bell — a gradient, so it never
  // shows the hard arc edge a flat ellipse would leave across the shoulders.
  topShade: [
    { color: "#B80C0E12", position: 0 },
    { color: "#5E0C0E12", position: 0.5 },
    { color: "#000C0E12", position: 1 },
  ],
};

// ---------------------------------------------------------------------------
// Surface shading model
// ---------------------------------------------------------------------------
// Grain has to know how bright the surface under it is. Without that it flattens
// the form: a speck tuned for the lit shoulder vanishes in the contact shadow,
// and one tuned for the shadow blows the highlight out. This evaluates the same
// gradient stack the artwork paints, from the same constants, so the shading the
// grain reacts to can never drift from the shading that is drawn.

/** Relative luminance of an #RRGGBB or #AARRGGBB colour, plus its alpha. */
export function parseColor(hex) {
  const h = hex.replace("#", "");
  const packed = h.length === 8;
  const alpha = packed ? parseInt(h.slice(0, 2), 16) / 255 : 1;
  const o = packed ? 2 : 0;
  const r = parseInt(h.slice(o, o + 2), 16);
  const g = parseInt(h.slice(o + 2, o + 4), 16);
  const b = parseInt(h.slice(o + 4, o + 6), 16);
  return { alpha, luma: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Sample a gradient stop list at t, returning blended alpha and luminance. */
function sampleStops(stops, t) {
  const u = clamp01(t);
  const parsed = stops.map((s, i) => ({
    ...parseColor(s.color),
    position: s.position ?? i / Math.max(1, stops.length - 1),
  }));
  if (u <= parsed[0].position) return parsed[0];
  for (let i = 1; i < parsed.length; i += 1) {
    const a = parsed[i - 1];
    const b = parsed[i];
    if (u <= b.position) {
      const k = (u - a.position) / (b.position - a.position || 1);
      return { alpha: lerp(a.alpha, b.alpha, k), luma: lerp(a.luma, b.luma, k) };
    }
  }
  return parsed[parsed.length - 1];
}

/** Source-over composite of one layer onto a base luminance. */
const over = (base, layer) => base * (1 - layer.alpha) + layer.luma * layer.alpha;

/** A radial field clipped to its own ellipse, exactly as the depth shapes draw. */
function radialField(x, y, { box, center, radius, stops }) {
  const ex = (x - box.x) / (box.width / 2);
  const ey = (y - box.y) / (box.height / 2);
  if (ex * ex + ey * ey > 1) return { alpha: 0, luma: 0 };
  const d = Math.hypot(x - center.x, y - center.y) / radius;
  if (d >= 1) return { alpha: 0, luma: 0 };
  return sampleStops(stops, d);
}

/** Flatten an open cubic path to a polyline. */

/** Shortest distance from a point to a polyline. */
function distanceToPath(x, y, polyline) {
  let best = Infinity;
  for (let i = 1; i < polyline.length; i += 1) {
    const [ax, ay] = polyline[i - 1];
    const [bx, by] = polyline[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : clamp01(((x - ax) * dx + (y - ay) * dy) / len);
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return best;
}

const BODY_TOP_LUMA = parseColor(COLOR.bodyTop).luma;
const BODY_BOTTOM_LUMA = parseColor(COLOR.bodyBottom).luma;
const HANDLE_TOP_LUMA = parseColor(COLOR.handleTop).luma;
const HANDLE_BOTTOM_LUMA = parseColor(COLOR.handleBottom).luma;
const RIM_LUMA = parseColor(COLOR.rim).luma;
const RIM_POLYLINE = flattenOpenPath(RIM_POINTS, 40);

/** Luminance of the grain-target colours, so speck alpha can be solved for. */
export const GRAIN_LIGHT_LUMA = parseColor(COLOR.grainLight).luma;
export const GRAIN_DARK_LUMA = parseColor(COLOR.grainDark).luma;

/**
 * Approximate luminance of the rest-pose body surface at a point in BodyPlate
 * space. Layers composite in the z order the scene draws them: base gradient,
 * contact shadow, front field, rim light.
 */
export function bodyLuma(x, y) {
  let luma = lerp(BODY_TOP_LUMA, BODY_BOTTOM_LUMA, clamp01((y + 140) / 280));

  luma = over(luma, radialField(x, y, {
    box: DEPTH_SHAPES.topShade,
    center: { x: DEPTH_SHAPES.topShade.x, y: DEPTH_SHAPES.topShade.y + 6 },
    radius: 68,
    stops: FIELD.topShade,
  }));

  luma = over(luma, radialField(x, y, {
    box: DEPTH_SHAPES.facePlate,
    center: { x: DEPTH_SHAPES.facePlate.x, y: DEPTH_SHAPES.facePlate.y - 14 },
    radius: 126,
    stops: FIELD.front,
  }));

  const rimDistance = distanceToPath(x, y, RIM_POLYLINE);
  if (rimDistance < 7.5) {
    // The round stroke edge is soft; feather the last two units so the grain
    // does not draw a hard band along the highlight.
    luma = over(luma, { alpha: 0.24 * clamp01((7.5 - rimDistance) / 2), luma: RIM_LUMA });
  }
  return luma;
}

/** Same, for the handle in HandlePlate space. */
export function handleLuma(x, y) {
  return lerp(HANDLE_TOP_LUMA, HANDLE_BOTTOM_LUMA, clamp01((y + 78) / 156));
}
