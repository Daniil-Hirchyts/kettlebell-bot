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
// Eye rig constants
// ---------------------------------------------------------------------------
export const EYE_Y = -35; // resting eye centre height in character space
export const EYE_RADIUS = 120; // radius of the imagined head cylinder the eyes ride on
export const EYE_AZIMUTH = 17.458; // degrees off centre => 2 * 120 * sin(17.458) = 72 px apart

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

// Ordered: the first entry is each eye's default solo child.
export const EYE_VARIANTS = [
  { key: "pill", kind: "rect", width: 24, height: 62, cornerRadius: 12 },
  { key: "tall", kind: "rect", width: 28, height: 76, cornerRadius: 14 },
  { key: "round", kind: "ellipse", width: 42, height: 42 },
  { key: "slit", kind: "rect", width: 34, height: 12, cornerRadius: 6 },
  { key: "arc", kind: "poly", points: arcPoints() },
  { key: "wedge", kind: "poly", points: wedgePoints(), mirrorable: true },
  { key: "star", kind: "poly", points: starPoints() },
];

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
// Depth / turnaround planes
// ---------------------------------------------------------------------------
export const PLATE_RADIUS = 118; // how far the front/back panels swing while turning

// Rim light: the upper-left run of the real body outline, stroked thick and
// clipped to the silhouette so only the inner half survives as a crescent.
const DEG = Math.PI / 180;
const polar = (angle, distance) => [Math.cos(angle * DEG) * distance, Math.sin(angle * DEG) * distance];

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
