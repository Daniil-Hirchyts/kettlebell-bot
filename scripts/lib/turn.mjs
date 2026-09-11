// Kettlebell Bot — yaw (turnaround) model.
//
// A flat global rotation cannot sell a turn for this character, so the yaw is a
// small projection model instead. Every turn-owned property is derived from one
// angle, which means facing poses, scripted head turns and full 360 spins all
// come out of the same maths and stay geometrically consistent with each other.
//
//   facing   0 = looking straight at the viewer
//           90 = right profile (the face points at the left edge of the screen)
//          180 = fully turned away
//          270 = left profile
//
// The three cues that carry the turn:
//   1. The handle is a plate with real depth, drawn as its near face, its far
//      face and the band between their tops, which together are its exact
//      projection. You see through its opening only where the two faces'
//      openings overlap, so the window closes well before the outline does.
//   2. The eyes are decals on the bell itself, at +/- EYE_AZIMUTH on the
//      BELL_RADIUS_X by BELL_RADIUS_Z cross-section, so they wrap around the
//      real form, foreshorten, and pass around its edge.
//   3. A front face panel and a back panel counter-slide across the body,
//      giving the bell a readable near and far surface.

import {
  BELL_DEPTH_RATIO,
  BELL_RADIUS_X,
  BELL_RADIUS_Z,
  EYE_AZIMUTH,
  HANDLE_DEPTH,
  HANDLE_HOLE,
  HANDLE_SHADING,
  HOLE_BOTTOM_HANDLE,
  HOLE_SIDE_X,
  HOLE_TOP_HANDLE,
  HOLE_VERTEX,
  KEY_LIGHT,
  PLATE_RADIUS,
} from "./geometry.mjs";

const DEG = Math.PI / 180;

// Foreshortening is normalised so facing 0 lands on exactly 1.0: the rest pose
// has to reproduce the static rig, or every single-animation preview would
// disagree with the state machine by a few percent.
const REST_FORESHORTEN = (() => {
  const p = EYE_AZIMUTH * DEG;
  const nx = Math.sin(p) / BELL_RADIUS_X;
  const nz = Math.cos(p) / BELL_RADIUS_Z;
  return 0.13 + (0.87 * nz) / Math.hypot(nx, nz);
})();

export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const round = (v, places = 4) => Number(v.toFixed(places));

// How the key light lands on a handle surface with this view-space normal, as
// the opacity of its shade and lift overlays. Measured against the face at
// rest, so the front view is exactly the static artwork; the lift tops out at
// the best a vertical surface can do, since the handle only ever yaws.
const REST_LIGHT = KEY_LIGHT[2];
const BEST_LIGHT = Math.hypot(KEY_LIGHT[0], KEY_LIGHT[2]);
function surfaceLight([nx, ny, nz]) {
  const lambert = Math.max(0, nx * KEY_LIGHT[0] + ny * KEY_LIGHT[1] + nz * KEY_LIGHT[2]);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  return {
    shade: HANDLE_SHADING.shadeMax * clamp01((REST_LIGHT - lambert) / REST_LIGHT),
    lift: HANDLE_SHADING.liftMax * clamp01((lambert - REST_LIGHT) / (BEST_LIGHT - REST_LIGHT)),
  };
}

// Every property the turn system owns. Anything not in this list belongs to
// another state-machine layer — see specs/animation-spec.md.
export const TURN_CHANNELS = [
  ["Yaw", "x"],
  ["Yaw", "y"],
  ["Yaw", "rotation"],
  ["Yaw", "scaleX"],
  ["Yaw", "scaleY"],
  ["BodyPlate", "scaleX"],
  ["HandleFace", "x"],
  ["HandleFace", "scaleX"],
  ["HandleFaceDetail", "opacity"],
  ["handle-face-shade", "opacity"],
  ["handle-face-lift", "opacity"],
  ["WallFar", "x"],
  ["WallFar", "scaleX"],
  ["WallFarEdge", "x"],
  ["WallFarEdge", "scaleX"],
  ["HandleBridge", "scaleX"],
  ["wall-far-shade", "opacity"],
  ["wall-far-lift", "opacity"],
  ["wall-bridge-shade", "opacity"],
  ["wall-bridge-lift", "opacity"],
  ["handle-cut#p1_0", "y"],
  ["handle-cut#p1_0", "distance"],
  ["handle-cut#p1_1", "x"],
  ["handle-cut#p1_1", "distance"],
  ["handle-cut#p1_2", "y"],
  ["handle-cut#p1_2", "distance"],
  ["handle-cut#p1_3", "x"],
  ["handle-cut#p1_3", "distance"],
  ["TurnFront", "x"],
  ["TurnFront", "scaleX"],
  ["TurnFront", "opacity"],
  ["TurnBack", "x"],
  ["TurnBack", "scaleX"],
  ["TurnBack", "opacity"],
  ["EyeL", "x"],
  ["EyeL", "scaleX"],
  ["EyeL", "opacity"],
  ["EyeR", "x"],
  ["EyeR", "scaleX"],
  ["EyeR", "opacity"],
];

export const channelKey = (target, property) => `${target}|${property}`;

/**
 * Full turn-owned pose for one facing angle.
 *
 * @param {number} deg    facing angle in degrees (any value; wraps naturally)
 * @param {object} [dyn]  dynamics layered on top of the static projection:
 *                        lean (deg), lift (px), drift (px), squash (0 = none)
 * @returns {Record<string, number>} channelKey -> value
 */
export function turnPose(deg, dyn = {}) {
  const a = deg * DEG;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const absCos = Math.abs(cos);
  const absSin = Math.abs(sin);

  // --- the see-through window ---------------------------------------------
  // You see through the plate only where the near face's opening and the far
  // face's overlap: two copies of the opening, each foreshortened by |cos a|,
  // set depth * |sin a| apart. Their overlap is a lens that narrows and
  // flattens as they slide apart -- for two ellipses exactly width * f and
  // height * sqrt(f (2 - f)) -- and it closes to a point. Closing it to a
  // zero-width sliver instead kept its full-height edges, and the renderer drew
  // them as a hairline down the middle of the handle.
  const holeHalf = HOLE_SIDE_X * absCos;
  const apart = (HANDLE_DEPTH / 2) * absSin;
  const f = holeHalf > 1e-9 ? Math.max(0, 1 - apart / holeHalf) : 0;
  const g = Math.sqrt(f * (2 - f));
  const hole = (key) => HANDLE_HOLE[HOLE_VERTEX[key]];
  const holeMidY = hole("left").y;

  // --- body + depth panels ------------------------------------------------
  // Exact projected width of the bell's cross-section ellipse. The eyes are
  // projections of the same ellipse, so using the real formula here (rather
  // than a linear approximation of it) is what keeps an eye pinned to the rim
  // at every angle and not just at 0 and 90.
  const bodyScaleX = Math.hypot(cos, BELL_DEPTH_RATIO * sin);
  const frontVisible = smoothstep(-0.04, 0.34, cos);
  const backVisible = smoothstep(-0.04, 0.34, -cos);

  // --- eyes on the bell's surface -----------------------------------------
  // An eye sits at azimuth p on the cross-section ellipse, so its unrotated
  // position is (Rx sin p, Rz cos p) with +z pointing at the viewer. Yawing that
  // point gives the screen x. How square-on the eye is to the viewer is a
  // property of the *surface*, not of the point, so it comes from the ellipse
  // normal -- (sin p / Rx, cos p / Rz) -- and not from the point's own depth.
  // On a circle the two agree; on a flattened bell they do not, and using the
  // point would hold an eye at full width past the angle where its patch of
  // surface has already turned edge-on.
  const eye = (azimuth) => {
    const p = azimuth * DEG;
    const sp = Math.sin(p);
    const cp = Math.cos(p);
    const nx = sp / BELL_RADIUS_X;
    const nz = cp / BELL_RADIUS_Z;
    const nLen = Math.hypot(nx, nz);
    const toward = (nx * sin + nz * cos) / nLen;
    // Foreshortening keeps a small floor so a turned eye stays readable, but
    // the floor goes as the eye reaches the limb, where a decal is edge-on and
    // thins to nothing. Fading it out while it still had width left a grey,
    // half-transparent eye beside the white one, which read as a ghost.
    return {
      x: BELL_RADIUS_X * sp * cos - BELL_RADIUS_Z * cp * sin,
      scaleX: Math.max(0.01, (0.13 * smoothstep(0, 0.2, toward) + 0.87 * Math.max(0, toward)) / REST_FORESHORTEN),
      opacity: smoothstep(0.0, 0.1, toward),
    };
  };
  const eyeL = eye(-EYE_AZIMUTH);
  const eyeR = eye(EYE_AZIMUTH);

  // --- the plate ----------------------------------------------------------
  // A plate this thick projects to the union of its near face, its far face
  // and the band between their tops -- exactly, for an outline that is convex
  // and symmetric -- so that is how it is drawn. The faces are the same shape,
  // half the plate's depth either side of centre, each foreshortened by
  // |cos a|; the band is depth * |sin a| wide. At profile the faces are edge-on
  // and the band is the whole handle.
  //
  // Which face is nearer only decides which one carries the face artwork; it
  // swaps at profile, where both are zero wide. The face stays opaque: it is
  // part of the silhouette, and fading it let the walls behind show through as
  // a ghost. Only its lighting and edge fade near profile, where a sliver's lit
  // edge otherwise reads as a stray bright nick.
  //
  // The far copy is mirrored onto whichever side it is on, so the half of it
  // that carries the wall tint is always its outer half. It swaps sides only
  // where it is zero wide or hidden under the face.
  const near = cos >= 0 ? 1 : -1;
  const faceX = -(HANDLE_DEPTH / 2) * sin * near;
  const faceWidth = Math.max(0.02, absCos);
  const farSide = -faceX < -1e-9 ? -1 : 1;
  const faceLight = surfaceLight([-sin * near, 0, cos * near]);
  // The wall that swings into view is on the side the face has moved away from.
  // Square-on, the wall showing swaps sides; the band is zero wide there, so the
  // two are cross-faded rather than switched, which keeps every loop that
  // passes through 0 or 180 seamless.
  const leftWall = surfaceLight([-cos, 0, -sin]);
  const rightWall = surfaceLight([cos, 0, sin]);
  const toRight = smoothstep(-0.12, 0.12, sin);
  const wallLight = {
    shade: leftWall.shade + (rightWall.shade - leftWall.shade) * toRight,
    lift: leftWall.lift + (rightWall.lift - leftWall.lift) * toRight,
  };

  // --- whole-body dynamics ------------------------------------------------
  const squash = dyn.squash ?? 0;
  const pose = {
    "Yaw|x": (dyn.drift ?? 0) + 5 * sin,
    "Yaw|y": dyn.lift ?? 0,
    "Yaw|rotation": dyn.lean ?? 0,
    "Yaw|scaleX": 1 + squash,
    "Yaw|scaleY": 1 - squash,
    "BodyPlate|scaleX": bodyScaleX,
    "HandleFace|x": faceX,
    "HandleFace|scaleX": faceWidth,
    "HandleFaceDetail|opacity": smoothstep(0.04, 0.3, absCos),
    "handle-face-shade|opacity": faceLight.shade,
    "handle-face-lift|opacity": faceLight.lift,
    "WallFar|x": -faceX,
    "WallFar|scaleX": farSide * faceWidth,
    "WallFarEdge|x": -faceX,
    "WallFarEdge|scaleX": faceWidth,
    "HandleBridge|scaleX": Math.max(0.002, absSin),
    "wall-far-shade|opacity": wallLight.shade,
    "wall-far-lift|opacity": wallLight.lift,
    "wall-bridge-shade|opacity": wallLight.shade,
    "wall-bridge-lift|opacity": wallLight.lift,
    "handle-cut#p1_0|y": holeMidY + (hole("top").y - holeMidY) * g,
    "handle-cut#p1_0|distance": HOLE_TOP_HANDLE * absCos * f,
    "handle-cut#p1_1|x": -holeHalf * f,
    "handle-cut#p1_1|distance": hole("left").cubic.distance * g,
    "handle-cut#p1_2|y": holeMidY + (hole("bottom").y - holeMidY) * g,
    "handle-cut#p1_2|distance": HOLE_BOTTOM_HANDLE * absCos * f,
    "handle-cut#p1_3|x": holeHalf * f,
    "handle-cut#p1_3|distance": hole("right").cubic.distance * g,
    "TurnFront|x": -PLATE_RADIUS * sin,
    "TurnFront|scaleX": Math.max(0.06, absCos),
    "TurnFront|opacity": frontVisible,
    "TurnBack|x": PLATE_RADIUS * sin,
    "TurnBack|scaleX": Math.max(0.06, absCos),
    "TurnBack|opacity": backVisible,
    "EyeL|x": eyeL.x,
    "EyeL|scaleX": eyeL.scaleX,
    "EyeL|opacity": eyeL.opacity,
    "EyeR|x": eyeR.x,
    "EyeR|scaleX": eyeR.scaleX,
    "EyeR|opacity": eyeR.opacity,
  };
  for (const key of Object.keys(pose)) pose[key] = round(pose[key]);
  return pose;
}

/**
 * Turn every sampled facing angle into a full set of animation tracks.
 * Samples are dense enough that the value curve itself carries the easing, so
 * a "smooth" interpolant between samples never reads as stepped.
 *
 * @param {Array<{frame:number, facing:number, dyn?:object}>} samples
 * @param {string} easing
 */
export function turnTracks(samples, easing = "smooth") {
  const poses = samples.map((s) => ({ frame: s.frame, values: turnPose(s.facing, s.dyn) }));
  const tracks = [];
  for (const [target, property] of TURN_CHANNELS) {
    const key = channelKey(target, property);
    const keyframes = [];
    let previous = null;
    for (const [index, pose] of poses.entries()) {
      const value = pose.values[key];
      const isLast = index === poses.length - 1;
      const next = isLast ? null : poses[index + 1].values[key];
      // Drop interior keyframes that do not move the value -- but only when the
      // value is flat on BOTH sides. The last keyframe of a flat run is a
      // shoulder and has to survive: without it the runtime has nothing between
      // the start of the hold and the first moving sample, so it ramps across
      // the whole span instead of holding and then moving. That is what made the
      // back panel start fading in at frame zero and show through the front of
      // the character during every spin.
      if (previous !== null && value === previous && !isLast && next === value) continue;
      keyframes.push(index === 0 ? { frame: pose.frame, value } : { frame: pose.frame, value, easing });
      previous = value;
    }
    if (keyframes.length === 1 && samples.length > 1) {
      keyframes.push({ frame: samples.at(-1).frame, value: keyframes[0].value, easing: "hold" });
    }
    tracks.push({ target, property, keyframes });
  }
  return tracks;
}

/** Single static pose, used by the `facing` blend state. */
export function turnPoseTracks(deg, dyn) {
  const values = turnPose(deg, dyn);
  return TURN_CHANNELS.map(([target, property]) => ({
    target,
    property,
    keyframes: [{ frame: 0, value: values[channelKey(target, property)] }],
  }));
}

/** Cubic ease used when sampling scripted head turns. */
export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t) => 1 - (1 - t) ** 3,
  in: (t) => t * t * t,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/**
 * Sample a keyframed facing curve at a fixed frame step.
 *
 * @param {Array<{frame:number, facing:number, ease?:string, dyn?:object}>} keys
 * @param {number} step  frames between generated samples
 */
export function sampleFacing(keys, step = 3) {
  const samples = [];
  const last = keys.at(-1).frame;
  for (let frame = 0; frame <= last; frame += step) {
    samples.push({ frame, ...evaluate(keys, frame) });
  }
  if (samples.at(-1).frame !== last) samples.push({ frame: last, ...evaluate(keys, last) });
  return samples;
}

function evaluate(keys, frame) {
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].frame <= frame) i += 1;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b) return { facing: a.facing, dyn: a.dyn ?? {} };
  const span = b.frame - a.frame || 1;
  const t = Math.min(1, Math.max(0, (frame - a.frame) / span));
  const eased = (ease[b.ease ?? "inOut"] ?? ease.inOut)(t);
  const lerp = (x, y) => x + (y - x) * eased;
  const da = a.dyn ?? {};
  const db = b.dyn ?? {};
  const keysOfDyn = new Set([...Object.keys(da), ...Object.keys(db)]);
  const dyn = {};
  for (const k of keysOfDyn) dyn[k] = lerp(da[k] ?? 0, db[k] ?? 0);
  return { facing: lerp(a.facing, b.facing), dyn };
}
