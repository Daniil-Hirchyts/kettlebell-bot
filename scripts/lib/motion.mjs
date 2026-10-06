// Kettlebell Bot — motion authoring helpers.
//
// Timing/easing tokens come from riv_design_tokens (seed #1B1D22, mood "tech"):
//   tap 6f · exit 15f · enter 27f · emphasis 30f · ambient 3.5s
//   enter = emphasized-decel · exit = emphasized-accel · move = smooth
//   loop = ease-in-out · spring = elastic-out · never linear on transforms.
//
// The one exception is a curve sampled densely (`wave`, `spline`): there the
// keys sit a few frames apart along a smooth curve and are joined straight,
// which is what keeps the motion going. Easing each short segment instead
// brings the body to a stop at every key — a breath that halts eight times a
// cycle reads as separate little moves, not one living motion.

export const FPS = 60;

export const E = {
  enter: "emphasized-decel",
  exit: "emphasized-accel",
  move: "smooth",
  loop: "ease-in-out",
  spring: "elastic-out",
  back: "ease-out-back",
  anticipate: "ease-in-back",
  snap: "snap",
  hold: "hold",
  in: "ease-in",
  out: "ease-out",
};

const round = (v) => (typeof v === "number" ? Number(v.toFixed(4)) : v);

/**
 * Channel: `ch("Char", "y", [[0, 0], [20, -8, E.enter], [40, 0, E.loop]])`
 * The easing on a keyframe describes the motion arriving at it.
 */
export function ch(target, property, keys) {
  if (!keys.length) throw new Error(`empty channel ${target}.${property}`);
  return {
    target,
    property,
    keyframes: keys.map(([frame, value, easing], i) => ({
      frame,
      value: round(value),
      ...(i === 0 ? {} : { easing: easing ?? E.loop }),
    })),
  };
}

/**
 * Seamless cyclic channel. `phase` is in cycles (0..1) and exists so no two
 * ambient tracks on the same object ever peak on the same frame.
 *
 * Sampled densely and joined straight, so the motion never stops: it slows
 * at the crests the way a sine does and keeps moving through them.
 */
export function wave(target, property, { duration, base = 0, amp = 1, phase = 0, cycles = 1, steps = 24, easing = "linear" }) {
  const keys = [];
  const total = steps * cycles;
  for (let i = 0; i <= total; i += 1) {
    const t = i / total;
    const frame = Math.round(t * duration);
    const value = base + amp * Math.sin(2 * Math.PI * (cycles * t + phase));
    keys.push([frame, value, easing]);
  }
  keys[keys.length - 1][1] = keys[0][1]; // guarantee a seamless loop
  return ch(target, property, keys);
}

/** Solo pose switch: `soloAt("EyeLSolo", [[0, "eyeL_round"], [40, "eyeL_pill"]])` */
export function soloAt(group, entries) {
  return {
    target: group,
    property: "soloActive",
    keyframes: entries.map(([frame, ref]) => ({ frame, ref })),
  };
}

/** Both eyes switch to the same variant at the same frames. */
export function eyes(entries) {
  return [
    soloAt("EyeLSolo", entries.map(([f, v]) => [f, `eyeL_${v}`])),
    soloAt("EyeRSolo", entries.map(([f, v]) => [f, `eyeR_${v}`])),
  ];
}

/** Per-eye variants, for asymmetric acting (confused, skeptical, wink). */
export function eyesSplit(left, right) {
  return [
    soloAt("EyeLSolo", left.map(([f, v]) => [f, `eyeL_${v}`])),
    soloAt("EyeRSolo", right.map(([f, v]) => [f, `eyeR_${v}`])),
  ];
}

/** Same channel on both eye expression nodes. */
export function bothEyes(property, keys, { mirror = false, offset = 0 } = {}) {
  const right = keys.map(([frame, value, easing]) => [
    frame + offset,
    mirror ? -value : value,
    easing,
  ]);
  return [ch("EyeLSolo", property, keys), ch("EyeRSolo", property, right)];
}

/**
 * Lid-style blink built from the expression node (each mood carries its own
 * blink rhythm; the Blink layer adds on-demand blinks on a separate node).
 */
export function moodBlink(frame, { close = 0.08, length = 10, wide = 1.08, offset = 0 } = {}) {
  const k = (f) => frame + f;
  const shape = [
    [k(0), 1],
    [k(length * 0.35), close, E.in],
    [k(length * 0.5), close, E.hold],
    [k(length * 0.8), wide, E.out],
    [k(length), 1, E.out],
  ];
  return [
    ch("EyeLSolo", "scaleY", shape),
    ch("EyeRSolo", "scaleY", shape.map(([f, v, e]) => [f + offset, v, e])),
  ];
}

export function loopAnim(name, duration, tracks) {
  return { name, fps: FPS, duration, loop: "loop", tracks: tracks.flat() };
}

export function oneShot(name, duration, tracks) {
  return { name, fps: FPS, duration, loop: "oneShot", tracks: tracks.flat() };
}

export function pose(name, tracks) {
  return { name, fps: FPS, duration: 1, loop: "loop", tracks: tracks.flat() };
}

/** Merge channels that target the same target+property (last write wins). */
export function mergeTracks(...groups) {
  const out = new Map();
  for (const track of groups.flat(3)) {
    if (!track) continue;
    out.set(`${track.target}|${track.property}`, track);
  }
  return [...out.values()];
}

/**
 * Volume compensation.
 *
 * Where an author moved one scale axis and left the other flat, derive the
 * companion axis so the shape conserves apparent area — a squash that only
 * shortens reads as the object shrinking rather than compressing. Applied to
 * the body and the eye expression nodes; the yaw system is deliberately
 * single-axis because rotating about a vertical axis really does only change
 * width.
 */
export function withVolume(anim, targets, gain = 0.45) {
  const index = new Map(anim.tracks.map((t) => [`${t.target}|${t.property}`, t]));
  const spread = (track) => {
    const values = track.keyframes.map((k) => k.value);
    return Math.max(...values) - Math.min(...values);
  };
  for (const target of targets) {
    for (const [driven, driver] of [["scaleX", "scaleY"], ["scaleY", "scaleX"]]) {
      const from = index.get(`${target}|${driver}`);
      const to = index.get(`${target}|${driven}`);
      if (!from || !to) continue;
      if (spread(from) < 1e-6 || spread(to) > 1e-6) continue;
      const baseDriver = from.keyframes[0].value || 1;
      const baseDriven = to.keyframes[0].value;
      // Bounded: a full eyelid close must widen the eye a little, not balloon it.
      const clamp = (v) => Math.min(baseDriven * 1.22, Math.max(baseDriven * 0.82, v));
      to.keyframes = from.keyframes.map((k, i) => ({
        frame: k.frame,
        value: Number(clamp(baseDriven * (1 + ((baseDriver - k.value) / baseDriver) * gain)).toFixed(4)),
        ...(i === 0 ? {} : { easing: k.easing ?? E.loop }),
      }));
    }
  }
  return anim;
}

export const VOLUME_TARGETS = ["Char", "BodyPivot", "HandlePivot", "EyeLSolo", "EyeRSolo"];

/**
 * A loop through key poses that never comes to rest: a periodic Catmull-Rom
 * curve through `points` (`[frame, value]` over one loop, starting at frame 0;
 * the loop closes back onto the first at `duration`), sampled every `step`
 * frames and joined straight. The motion slows where the curve turns, snaps
 * where the poses are close in time, and carries straight on through the
 * seam into the next cycle — wind-up, strike and follow-through as one swing.
 */
export function spline(target, property, duration, points, { step = 2 } = {}) {
  const n = points.length;
  const at = (i) => {
    const k = ((i % n) + n) % n;
    const wraps = Math.floor(i / n);
    return [points[k][0] + wraps * duration, points[k][1]];
  };
  const value = (frame) => {
    let i = 0;
    for (let j = 0; j < n; j += 1) if (points[j][0] <= frame) i = j;
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]);
    const m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]);
    const h = p2[0] - p1[0];
    const t = (frame - p1[0]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * h * m1
      + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * h * m2;
  };
  const keys = [];
  for (let frame = 0; frame < duration; frame += step) keys.push([frame, value(frame), "linear"]);
  keys.push([duration, keys[0][1], "linear"]);
  return ch(target, property, keys);
}
