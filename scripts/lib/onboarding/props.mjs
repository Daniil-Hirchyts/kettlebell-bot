// Kettlebell Bot — onboarding props.
//
// Every prop is built from the mascot's own materials: the charcoal body
// gradient, the off-white of its eyes, the rim grey of its edge light. The
// kettlebell prop IS the mascot's silhouette, and the sparkle is its celebrate
// eye, so the supporting cast reads as the same world rather than clip art.
//
// Factories return { groups, shapes }. Anything a scene animates is a group, so
// shapes stay static and keyed transforms never fight a shape's rest offset.

import {
  BODY_EDGE_RUNS,
  BODY_POINTS,
  EDGE_LIGHT,
  EYE_VARIANTS,
  HANDLE_CY,
  HANDLE_HOLE,
  HANDLE_OUTER,
} from "../geometry.mjs";
import { PAL, PT } from "./kit.mjs";

export const merge = (...parts) => ({
  groups: parts.flatMap((p) => p.groups ?? []),
  shapes: parts.flatMap((p) => p.shapes ?? []),
});

export const inkFill = (h, top = PAL.ink, bottom = PAL.inkDeep) => ({
  gradient: {
    type: "linear",
    start: { x: 0, y: -h / 2 },
    end: { x: 0, y: h / 2 },
    stops: [{ color: top }, { color: bottom }],
  },
});

const KAPPA = 0.5523;
const r2 = (v) => Number(v.toFixed(2));

/** Four-point Bézier circle; `reverse` winds it the other way, for holes. */
export function circlePoints(r, { cx = 0, cy = 0, reverse = false } = {}) {
  const pts = [
    { x: cx, y: cy - r, cubic: { rotation: 0, distance: r * KAPPA } },
    { x: cx + r, y: cy, cubic: { rotation: 90, distance: r * KAPPA } },
    { x: cx, y: cy + r, cubic: { rotation: 180, distance: r * KAPPA } },
    { x: cx - r, y: cy, cubic: { rotation: -90, distance: r * KAPPA } },
  ];
  if (!reverse) return pts;
  return pts.reverse().map((p) => ({ ...p, cubic: { ...p.cubic, rotation: p.cubic.rotation + 180 } }));
}

/** Rounded rectangle as straight vertices with corner radii (keyable corners). */
export function roundedRectPoints(w, h, r, { cx = 0, cy = 0 } = {}) {
  return [
    { x: cx - w / 2, y: cy - h / 2, radius: r },
    { x: cx + w / 2, y: cy - h / 2, radius: r },
    { x: cx + w / 2, y: cy + h / 2, radius: r },
    { x: cx - w / 2, y: cy + h / 2, radius: r },
  ];
}

// ---------------------------------------------------------------------------
// The kettlebell — the mascot's own silhouette without a face
// ---------------------------------------------------------------------------

/**
 * @param {object} o
 * @param {string} o.id     group id; the bell's centre of mass sits at its origin
 * @param {"ink"|"light"} [o.tone]
 */
export function bell({ id, parent, x = 0, y = 0, scale = 0.2, z, tone = "ink", opacity }) {
  const light = tone === "light";
  const groups = [
    { id, parent, x, y, scaleX: scale, scaleY: scale, ...(opacity === undefined ? {} : { opacity }) },
    { id: `${id}-handle`, parent: id, x: 0, y: HANDLE_CY },
  ];
  const shapes = [
    {
      id: `${id}-handle-shape`,
      type: "polygon",
      parent: `${id}-handle`,
      x: 0,
      y: 0,
      z,
      subpaths: [
        { closed: true, points: HANDLE_OUTER },
        { closed: true, points: HANDLE_HOLE },
      ],
      fill: light ? { color: PAL.light } : inkFill(156, "#252932", "#171A20"),
    },
    {
      id: `${id}-body`,
      type: "polygon",
      parent: id,
      x: 0,
      y: 0,
      z: z + 0.1,
      closed: true,
      points: BODY_POINTS,
      fill: light ? { color: PAL.light } : inkFill(280),
    },
  ];
  if (!light) {
    // The mascot's key-light edge, so a prop bell is lit from the same side.
    BODY_EDGE_RUNS.forEach((points, index) =>
      shapes.push({
        id: `${id}-edge-${index}`,
        type: "polygon",
        parent: id,
        x: 0,
        y: 0,
        z: z + 0.2,
        closed: false,
        points,
        opacity: EDGE_LIGHT.opacity,
        clipBy: `${id}-body`,
        stroke: { color: PAL.rim, thickness: EDGE_LIGHT.body.thickness, cap: "round", join: "round" },
      }),
    );
  }
  return { groups, shapes };
}

// ---------------------------------------------------------------------------
// Weight plate, dumbbell
// ---------------------------------------------------------------------------

/** A capsule slot, wound against the disc, at `angle` degrees on radius `at`. */
function slotHole(r, angle, at) {
  const a = (angle * Math.PI) / 180;
  const cx = Math.cos(a) * at;
  const cy = Math.sin(a) * at;
  const half = r * 0.25; // along the tangent
  const w = r * 0.11; // half width
  const t = [-Math.sin(a), Math.cos(a)];
  const n = [Math.cos(a), Math.sin(a)];
  const corner = (u, v) => ({ x: r2(cx + t[0] * u + n[0] * v), y: r2(cy + t[1] * u + n[1] * v), radius: r2(w * 0.98) });
  // Counter-clockwise on screen, against the clockwise disc.
  return [corner(-half, -w), corner(half, -w), corner(half, w), corner(-half, w)];
}

/** Weight plate with three grip slots, so a spin reads. */
export function plate({ id, parent, x = 0, y = 0, r = 52, z, opacity }) {
  return {
    groups: [{ id, parent, x, y, ...(opacity === undefined ? {} : { opacity }) }],
    shapes: [
      {
        id: `${id}-disc`,
        type: "polygon",
        parent: id,
        x: 0,
        y: 0,
        z,
        subpaths: [
          { closed: true, points: circlePoints(r) },
          { closed: true, points: circlePoints(r * 0.16, { reverse: true }) },
          ...[-90, 30, 150].map((angle) => ({ closed: true, points: slotHole(r, angle, r * 0.6) })),
        ],
        fill: inkFill(r * 2),
      },
      {
        id: `${id}-ring`,
        type: "ellipse",
        parent: id,
        x: 0,
        y: 0,
        z: z + 0.1,
        width: r * 1.84,
        height: r * 1.84,
        opacity: 0.4,
        stroke: { color: PAL.rim, thickness: r * 0.05 },
      },
      {
        id: `${id}-lip`,
        type: "ellipse",
        parent: id,
        x: 0,
        y: 0,
        z: z + 0.2,
        width: r * 0.62,
        height: r * 0.62,
        opacity: 0.35,
        stroke: { color: PAL.rim, thickness: r * 0.05 },
      },
    ],
  };
}

export function dumbbell({ id, parent, x = 0, y = 0, size = 1, z, opacity, tone = "ink" }) {
  const s = size;
  const light = tone === "light";
  const fill = (h) => (light ? { color: PAL.light } : inkFill(h));
  const shapes = [
    { id: `${id}-bar`, type: "rect", parent: id, x: 0, y: 0, z, width: 70 * s, height: 10 * s, cornerRadius: 5 * s, fill: light ? { color: PAL.light } : { color: PAL.inkRaised } },
  ];
  for (const side of [-1, 1]) {
    const tag = side < 0 ? "l" : "r";
    shapes.push(
      { id: `${id}-plate-${tag}`, type: "rect", parent: id, x: side * 30 * s, y: 0, z: z + 0.1, width: 16 * s, height: 50 * s, cornerRadius: 7 * s, fill: fill(50 * s) },
      { id: `${id}-cap-${tag}`, type: "rect", parent: id, x: side * 44 * s, y: 0, z: z + 0.1, width: 11 * s, height: 34 * s, cornerRadius: 5 * s, fill: fill(34 * s) },
    );
  }
  return { groups: [{ id, parent, x, y, ...(opacity === undefined ? {} : { opacity }) }], shapes };
}

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

/** The mascot's celebrate eye, as a sparkle. */
const STAR = EYE_VARIANTS.find((v) => v.key === "star").points;

export function sparkle({ id, parent, x = 0, y = 0, scale = 1, z, color = PAL.ink, opacity }) {
  return {
    groups: [{ id, parent, x, y, scaleX: scale, scaleY: scale, ...(opacity === undefined ? {} : { opacity }) }],
    shapes: [{ id: `${id}-shape`, type: "polygon", parent: id, x: 0, y: 0, z, closed: true, points: STAR, fill: { color } }],
  };
}

export const HEART_POINTS = [
  { x: 0, y: -15, cubic: { rotation: -58, inRotation: -122, inDistance: 9, outDistance: 9 } },
  { x: 17, y: -29, cubic: { rotation: 0, distance: 10 } },
  { x: 33, y: -11, cubic: { rotation: 90, distance: 11 } },
  { x: 0, y: 28, cubic: { rotation: -132, inRotation: -48, inDistance: 13, outDistance: 13 } },
  { x: -33, y: -11, cubic: { rotation: -90, distance: 11 } },
  { x: -17, y: -29, cubic: { rotation: 0, distance: 10 } },
];

export function heart({ id, parent, x = 0, y = 0, scale = 1, z, opacity }) {
  return {
    groups: [{ id, parent, x, y, scaleX: scale, scaleY: scale, ...(opacity === undefined ? {} : { opacity }) }],
    shapes: [
      { id: `${id}-badge`, type: "ellipse", parent: id, x: 0, y: 0, z, width: 96, height: 96, fill: inkFill(96) },
      { id: `${id}-shape`, type: "polygon", parent: id, x: 0, y: 3, z: z + 0.1, scaleX: 0.9, scaleY: 0.9, closed: true, points: HEART_POINTS, fill: { color: PAL.light } },
    ],
  };
}

/** Round badge with a check that draws itself (key `${id}-tick` trimEnd). */
export function check({ id, parent, x = 0, y = 0, scale = 1, z, opacity }) {
  return {
    groups: [{ id, parent, x, y, scaleX: scale, scaleY: scale, ...(opacity === undefined ? {} : { opacity }) }],
    shapes: [
      { id: `${id}-badge`, type: "ellipse", parent: id, x: 0, y: 0, z, width: 64, height: 64, fill: inkFill(64) },
      {
        id: `${id}-tick`,
        type: "polygon",
        parent: id,
        x: 0,
        y: 0,
        z: z + 0.1,
        closed: false,
        points: [{ x: -14, y: 1 }, { x: -4, y: 11 }, { x: 15, y: -10 }],
        stroke: { color: PAL.light, thickness: 7.5, cap: "round", join: "round", trim: { start: 0, end: 0 } },
      },
    ],
  };
}

export const FLAME_POINTS = [
  { x: 2, y: -58, cubic: { rotation: 64, inRotation: 118, outDistance: 24, inDistance: 30 } },
  { x: 30, y: 4, cubic: { rotation: 90, distance: 19 } },
  { x: 0, y: 36, cubic: { rotation: 180, distance: 18 } },
  { x: -30, y: 4, cubic: { rotation: -90, distance: 19 } },
];

/** Flame: an ink outer flame and a light core, each on its own group. */
export function flame({ id, parent, x = 0, y = 0, scale = 1, z }) {
  return {
    groups: [
      { id, parent, x, y, scaleX: scale, scaleY: scale },
      { id: `${id}-outer`, parent: id, x: 0, y: 36 },
      { id: `${id}-core`, parent: id, x: 0, y: 36 },
    ],
    shapes: [
      { id: `${id}-outer-shape`, type: "polygon", parent: `${id}-outer`, x: 0, y: -36, z, closed: true, points: FLAME_POINTS, fill: inkFill(94) },
      {
        id: `${id}-core-shape`,
        type: "polygon",
        parent: `${id}-core`,
        x: 0,
        y: -18,
        z: z + 0.1,
        scaleX: 0.46,
        scaleY: 0.5,
        closed: true,
        points: FLAME_POINTS,
        fill: { color: PAL.light },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Card and slot surfaces
// ---------------------------------------------------------------------------

/**
 * A raised card: two soft stepped shadow layers, surface, and a hairline
 * outline. Its origin is its centre.
 */
export function card({ id, parent, x = 0, y = 0, w, h, r = 20 * PT, z, rotation, opacity, tone = "surface" }) {
  const fill = tone === "ink" ? inkFill(h) : { color: PAL.surface };
  return {
    groups: [{ id, parent, x, y, ...(rotation ? { rotation } : {}), ...(opacity === undefined ? {} : { opacity }) }],
    shapes: [
      { id: `${id}-shadow-far`, type: "rect", parent: id, x: 0, y: 14, z, width: w + 8, height: h + 4, cornerRadius: r + 4, fill: { color: "#0A1E2129" } },
      { id: `${id}-shadow-near`, type: "rect", parent: id, x: 0, y: 5, z: z + 0.1, width: w + 2, height: h + 2, cornerRadius: r + 1, fill: { color: "#101E2129" } },
      {
        id: `${id}-face`,
        type: "rect",
        parent: id,
        x: 0,
        y: 0,
        z: z + 0.2,
        width: w,
        height: h,
        cornerRadius: r,
        fill,
        ...(tone === "ink" ? {} : { stroke: { color: PAL.outline, thickness: 1.5 * PT } }),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Pictogram figure
// ---------------------------------------------------------------------------

// A figure is a head and five round-capped strokes. Poses name ten joints;
// limbs are open paths whose vertices a scene keys, so a figure can act.
const LIMBS = {
  torso: ["neck", "hip"],
  armB: ["shoulderB", "elbowB", "handB"],
  legB: ["hip", "kneeB", "footB"],
  legF: ["hip", "kneeF", "footF"],
  armF: ["shoulderF", "elbowF", "handF"],
};

export function figure({ id, parent, x = 0, y = 0, scale = 1, z, pose, color = PAL.ink, weight = 1, back = null }) {
  const t = 7.5 * weight;
  const thickness = { torso: t * 2.1, armB: t, armF: t, legB: t * 1.25, legF: t * 1.25 };
  const shapes = [];
  let order = 0;
  for (const [limb, joints] of Object.entries(LIMBS)) {
    const behind = limb.endsWith("B");
    shapes.push({
      id: `${id}-${limb}`,
      type: "polygon",
      parent: id,
      x: 0,
      y: 0,
      z: z + (order += 0.1),
      closed: false,
      points: joints.map((j) => ({ x: pose[j][0], y: pose[j][1] })),
      stroke: { color: behind && back ? back : color, thickness: thickness[limb], cap: "round", join: "round" },
    });
  }
  shapes.push({
    id: `${id}-head-shape`,
    type: "ellipse",
    parent: `${id}-head`,
    x: 0,
    y: 0,
    z: z + 0.9,
    width: 21 * weight,
    height: 21 * weight,
    fill: { color },
  });
  return {
    groups: [
      { id, parent, x, y, scaleX: scale, scaleY: scale },
      { id: `${id}-head`, parent: id, x: pose.head[0], y: pose.head[1] },
    ],
    shapes,
  };
}

/** Key a figure into `pose` at `frame`. */
export function keyFigure(tl, id, frame, pose, easing) {
  for (const [limb, joints] of Object.entries(LIMBS)) {
    joints.forEach((joint, index) => {
      tl.keys(`${id}-${limb}#p0_${index}`, "x", [[frame, pose[joint][0], easing]]);
      tl.keys(`${id}-${limb}#p0_${index}`, "y", [[frame, pose[joint][1], easing]]);
    });
  }
  tl.keys(`${id}-head`, "x", [[frame, pose.head[0], easing]]);
  tl.keys(`${id}-head`, "y", [[frame, pose.head[1], easing]]);
}

/** Declare a figure's rest pose on the timeline (the pose it loops from). */
export function restFigure(tl, id, pose) {
  for (const [limb, joints] of Object.entries(LIMBS)) {
    joints.forEach((joint, index) => {
      tl.rest(`${id}-${limb}#p0_${index}`, "x", pose[joint][0]);
      tl.rest(`${id}-${limb}#p0_${index}`, "y", pose[joint][1]);
    });
  }
  tl.rest(`${id}-head`, "x", pose.head[0]);
  tl.rest(`${id}-head`, "y", pose.head[1]);
}

const mirror = (pose) => Object.fromEntries(Object.entries(pose).map(([k, [px, py]]) => [k, [-px, py]]));

// Poses, in a 100-unit-tall figure standing on y = 0. Front views carry real
// shoulders; side views put both shoulders at the neck.
const side = (pose) => ({ ...pose, shoulderB: pose.neck, shoulderF: pose.neck });
export const POSES = {
  stand: {
    head: [0, -91], neck: [0, -70], hip: [0, -38], shoulderB: [-11, -66], shoulderF: [11, -66],
    elbowB: [-17, -50], handB: [-19, -34], elbowF: [17, -50], handF: [19, -34],
    kneeB: [-7, -19], footB: [-9, 0], kneeF: [7, -19], footF: [9, 0],
  },
  press: {
    head: [0, -91], neck: [0, -70], hip: [0, -38], shoulderB: [-12, -66], shoulderF: [12, -66],
    elbowB: [-27, -80], handB: [-22, -104], elbowF: [27, -80], handF: [22, -104],
    kneeB: [-8, -19], footB: [-12, 0], kneeF: [8, -19], footF: [12, 0],
  },
  squat: {
    head: [0, -74], neck: [0, -53], hip: [0, -26], shoulderB: [-11, -49], shoulderF: [11, -49],
    elbowB: [-22, -36], handB: [-9, -40], elbowF: [22, -36], handF: [9, -40],
    kneeB: [-27, -24], footB: [-17, 0], kneeF: [27, -24], footF: [17, 0],
  },
  // Side view, facing +x. Swing top: hips through, bell floated to chest height.
  swingTop: side({
    head: [-2, -90], neck: [-1, -70], hip: [1, -37],
    elbowB: [16, -62], handB: [33, -58], elbowF: [16, -62], handF: [33, -58],
    kneeB: [0, -18], footB: [-3, 0], kneeF: [3, -18], footF: [6, 0],
  }),
  // Swing bottom: hinged at the hips, bell back between the knees.
  swingBottom: side({
    head: [32, -71], neck: [18, -58], hip: [-12, -35],
    elbowB: [12, -40], handB: [4, -24], elbowF: [12, -40], handF: [4, -24],
    kneeB: [4, -17], footB: [-3, 0], kneeF: [7, -17], footF: [6, 0],
  }),
  lunge: side({
    head: [2, -84], neck: [1, -64], hip: [0, -31],
    elbowB: [-10, -48], handB: [-12, -32], elbowF: [10, -48], handF: [12, -32],
    kneeB: [-22, -8], footB: [-40, 0], kneeF: [22, -29], footF: [25, 0],
  }),
};
POSES.pressMirror = mirror(POSES.press);

// ---------------------------------------------------------------------------
// Body silhouette with muscle regions
// ---------------------------------------------------------------------------

/**
 * Front-facing body in ink with light muscle regions on their own groups
 * (`${id}-glow-<region>`), which a scene fades in. ~220 units tall at scale 1.
 */
export function bodyMap({ id, parent, x = 0, y = 0, scale = 1, z, regions = ["shoulders", "core", "legs"] }) {
  const shapes = [];
  const groups = [{ id, parent, x, y, scaleX: scale, scaleY: scale }];
  const add = (shape) => shapes.push({ parent: id, x: 0, y: 0, ...shape });
  const limb = (name, points, thickness, zz = z) =>
    add({ id: `${id}-${name}`, type: "polygon", z: zz, closed: false, points: points.map(([px, py]) => ({ x: px, y: py })), stroke: { color: PAL.ink, thickness, cap: "round", join: "round" } });

  add({ id: `${id}-head`, type: "ellipse", x: 0, y: -176, z, width: 40, height: 46, fill: inkFill(46) });
  add({ id: `${id}-neck`, type: "rect", x: 0, y: -148, z, width: 18, height: 20, cornerRadius: 6, fill: { color: PAL.ink } });
  add({
    id: `${id}-torso`,
    type: "polygon",
    z: z + 0.1,
    closed: true,
    points: [
      { x: -46, y: -138, radius: 20 },
      { x: 46, y: -138, radius: 20 },
      { x: 30, y: -40, radius: 12 },
      { x: -30, y: -40, radius: 12 },
    ],
    fill: inkFill(100),
  });
  add({ id: `${id}-pelvis`, type: "rect", x: 0, y: -30, z: z + 0.1, width: 64, height: 36, cornerRadius: 14, fill: { color: PAL.inkDeep } });
  limb("arm-l", [[-44, -126], [-56, -76], [-60, -30]], 20);
  limb("arm-r", [[44, -126], [56, -76], [60, -30]], 20);
  limb("leg-l", [[-18, -26], [-22, 30], [-24, 86]], 26);
  limb("leg-r", [[18, -26], [22, 30], [24, 86]], 26);

  const glow = (region, shapesOf) => {
    groups.push({ id: `${id}-glow-${region}`, parent: id, x: 0, y: 0, opacity: 0 });
    for (const s of shapesOf) shapes.push({ parent: `${id}-glow-${region}`, x: 0, y: 0, z: z + 0.5, ...s });
  };
  const light = (pts, thickness) => ({ type: "polygon", closed: false, points: pts.map(([px, py]) => ({ x: px, y: py })), stroke: { color: PAL.light, thickness, cap: "round", join: "round" } });
  if (regions.includes("shoulders")) {
    glow("shoulders", [
      { id: `${id}-glow-sh-l`, ...light([[-36, -128], [-48, -112]], 16) },
      { id: `${id}-glow-sh-r`, ...light([[36, -128], [48, -112]], 16) },
    ]);
  }
  if (regions.includes("arms")) {
    glow("arms", [
      { id: `${id}-glow-arm-l`, ...light([[-50, -104], [-56, -82]], 11) },
      { id: `${id}-glow-arm-r`, ...light([[50, -104], [56, -82]], 11) },
    ]);
  }
  if (regions.includes("chest")) {
    glow("chest", [
      { id: `${id}-glow-chest-l`, type: "rect", x: -15, y: -114, width: 24, height: 20, cornerRadius: 8, fill: { color: PAL.light } },
      { id: `${id}-glow-chest-r`, type: "rect", x: 15, y: -114, width: 24, height: 20, cornerRadius: 8, fill: { color: PAL.light } },
    ]);
  }
  if (regions.includes("core")) {
    glow("core", [{ id: `${id}-glow-core-shape`, type: "rect", x: 0, y: -74, width: 30, height: 42, cornerRadius: 10, fill: { color: PAL.light } }]);
  }
  if (regions.includes("legs")) {
    glow("legs", [
      { id: `${id}-glow-leg-l`, ...light([[-19, -6], [-21, 22]], 13) },
      { id: `${id}-glow-leg-r`, ...light([[19, -6], [21, 22]], 13) },
    ]);
  }
  return { groups, shapes: shapes.map((s) => ({ ...s, x: r2(s.x), y: r2(s.y) })) };
}
