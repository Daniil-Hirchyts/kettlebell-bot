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
//   1. The handle is a flat plate. Its projected width is |cos a| plus the
//      plate's own depth times |sin a|, and its opening closes faster than the
//      outer silhouette because the near arm occludes the far one.
//   2. The eyes ride on a cylinder of radius EYE_RADIUS at +/- EYE_AZIMUTH, so
//      they wrap around the form, foreshorten, and pass behind the limb.
//   3. A front face panel and a back panel counter-slide across the body,
//      giving the bell a readable near and far surface.

import {
  EYE_AZIMUTH,
  EYE_RADIUS,
  HANDLE_DEPTH,
  HANDLE_HOLE_WIDTH,
  HANDLE_OUTER_WIDTH,
  HOLE_BOTTOM_HANDLE,
  HOLE_SIDE_X,
  HOLE_TOP_HANDLE,
  PLATE_RADIUS,
} from "./geometry.mjs";

const DEG = Math.PI / 180;

export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const round = (v, places = 4) => Number(v.toFixed(places));

// Every property the turn system owns. Anything not in this list belongs to
// another state-machine layer — see specs/animation-spec.md.
export const TURN_CHANNELS = [
  ["Yaw", "x"],
  ["Yaw", "y"],
  ["Yaw", "rotation"],
  ["Yaw", "scaleX"],
  ["Yaw", "scaleY"],
  ["BodyPlate", "scaleX"],
  ["HandlePlate", "scaleX"],
  ["handle-shape#p1_1", "x"],
  ["handle-shape#p1_3", "x"],
  ["handle-shape#p1_0", "distance"],
  ["handle-shape#p1_2", "distance"],
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

  // --- handle -------------------------------------------------------------
  const handleScaleX = absCos + (HANDLE_DEPTH / HANDLE_OUTER_WIDTH) * absSin;
  const holeProjected = HANDLE_HOLE_WIDTH * absCos - HANDLE_DEPTH * absSin;
  const hole = Math.max(0, holeProjected / (HANDLE_HOLE_WIDTH * handleScaleX));

  // --- body + depth panels ------------------------------------------------
  const bodyScaleX = 1 - 0.05 * (1 - absCos);
  const frontVisible = smoothstep(-0.04, 0.34, cos);
  const backVisible = smoothstep(-0.04, 0.34, -cos);

  // --- eyes on the head cylinder -----------------------------------------
  // Foreshortening is normalised so facing 0 lands on exactly 1.0: the rest
  // pose has to reproduce the static rig, or every single-animation preview
  // would disagree with the state machine by a few percent.
  const REST_FORESHORTEN = 0.13 + 0.87 * Math.cos(EYE_AZIMUTH * DEG);
  const eye = (azimuth) => {
    const d = (azimuth - deg) * DEG;
    const depth = Math.cos(d);
    return {
      x: EYE_RADIUS * Math.sin(d),
      scaleX: (0.13 + 0.87 * Math.max(0, depth)) / REST_FORESHORTEN,
      opacity: smoothstep(0.0, 0.26, depth),
    };
  };
  const eyeL = eye(-EYE_AZIMUTH);
  const eyeR = eye(EYE_AZIMUTH);

  // --- whole-body dynamics ------------------------------------------------
  const squash = dyn.squash ?? 0;
  const pose = {
    "Yaw|x": (dyn.drift ?? 0) + 5 * sin,
    "Yaw|y": dyn.lift ?? 0,
    "Yaw|rotation": dyn.lean ?? 0,
    "Yaw|scaleX": 1 + squash,
    "Yaw|scaleY": 1 - squash,
    "BodyPlate|scaleX": bodyScaleX,
    "HandlePlate|scaleX": handleScaleX,
    "handle-shape#p1_1|x": -HOLE_SIDE_X * hole,
    "handle-shape#p1_3|x": HOLE_SIDE_X * hole,
    "handle-shape#p1_0|distance": HOLE_TOP_HANDLE * hole,
    "handle-shape#p1_2|distance": HOLE_BOTTOM_HANDLE * hole,
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
