// Small monochrome accents. Projection and playback own different nodes:
// yaw moves/occludes the emitter, a shot moves the mote in its tangent plane,
// and intensity multiplies visibility. No effect ever keys the character.
import { COLOR } from "./geometry.mjs";
import { ch, E, oneShot, pose, soloAt } from "./motion.mjs";

export const FX_SLOTS = [-65, -35, -10, 10, 35, 65].map((azimuth, i) => ({
  index: i, azimuth, emitter: `FxEmitter${i}`, projection: `FxProjection${i}`, particle: `FxParticle${i}`, solo: `FxGlyph${i}`,
}));
export const FX_KINDS = ["spark", "mote", "drop", "dust"];
const DEG = Math.PI / 180;
const rounded = (v) => Number(v.toFixed(4));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const FX_TURN_CHANNELS = FX_SLOTS.flatMap((s) => [
  [s.projection, "x"], [s.projection, "scaleX"], [s.projection, "opacity"],
  [s.solo, "scaleX"],
]);
export function fxTurnPose(degrees) {
  const yaw = degrees * DEG;
  return Object.fromEntries(FX_SLOTS.flatMap((s) => {
    const p = s.azimuth * DEG;
    const normal = Math.cos(p - yaw);
    const tangentWidth = normal / Math.cos(p);
    return [
      [`${s.projection}|x`, rounded(160 * Math.sin(p) * Math.cos(yaw) - 152 * Math.cos(p) * Math.sin(yaw))],
      [`${s.projection}|scaleX`, rounded(tangentWidth)],
      // Flight follows the tangent plane; small volumetric marks retain their
      // width instead of turning a drop into a wide triangle at three-quarter.
      [`${s.solo}|scaleX`, rounded(1 / Math.max(0.18, Math.abs(tangentWidth)))],
      // A front-surface effect cannot shine through the back of the bell.
      [`${s.projection}|opacity`, rounded(smooth(0, 0.24, normal))],
    ];
  }));
}

export function buildEffectGroups() {
  const rest = fxTurnPose(0);
  return [
    { id: "FxIntensity", parent: "BodyPivot", opacity: 1 },
    ...FX_SLOTS.flatMap((s) => [
      { id: s.emitter, parent: "FxIntensity", scaleX: 1 },
      { id: s.projection, parent: s.emitter, x: rest[`${s.projection}|x`], scaleX: 1, opacity: 1 },
      { id: s.particle, parent: s.projection, x: 0, y: 0, opacity: 0 },
      { id: s.solo, parent: s.particle, solo: true, active: `fx${s.index}_mote` },
    ]),
  ];
}

const spark = [
  { x: 0, y: -9, radius: 1.4 }, { x: 2.2, y: -2.2, radius: 1.6 },
  { x: 6, y: 0, radius: 1.4 }, { x: 2.2, y: 2.2, radius: 1.6 },
  { x: 0, y: 9, radius: 1.4 }, { x: -2.2, y: 2.2, radius: 1.6 },
  { x: -6, y: 0, radius: 1.4 }, { x: -2.2, y: -2.2, radius: 1.6 },
];
const drop = [
  { x: 0, y: -9, radius: 2.4 },
  { x: 5.5, y: 3, cubic: { rotation: 90, inDistance: 4, outDistance: 4 } },
  { x: 0, y: 9, cubic: { rotation: 180, inDistance: 3.5, outDistance: 3.5 } },
  { x: -5.5, y: 3, cubic: { rotation: -90, inDistance: 4, outDistance: 4 } },
];
export function buildEffectShapes() {
  return FX_SLOTS.flatMap((s) => FX_KINDS.map((kind) => {
    const base = { id: `fx${s.index}_${kind}`, parent: s.solo, z: 220 + s.index,
      fill: { color: kind === "dust" ? "#858991" : kind === "mote" ? COLOR.rim : COLOR.eye },
      stroke: { color: COLOR.bodyTop, thickness: kind === "dust" ? 0.6 : 0.9, cap: "round", join: "round" } };
    if (kind === "spark" || kind === "drop") return { ...base, type: "polygon", closed: true, points: kind === "spark" ? spark : drop };
    return { ...base, type: "rect", width: kind === "dust" ? 11 : 6, height: kind === "dust" ? 4 : 10,
      cornerRadius: kind === "dust" ? 2 : 3 };
  }));
}

export const FX_CHANNELS = FX_SLOTS.flatMap((s) => [
  [s.emitter, "scaleX", 1],
  ...["x", "y", "rotation", "scaleX", "scaleY", "opacity"].map((p) => [s.particle, p, p.startsWith("scale") ? 1 : 0]),
  [s.solo, "soloActive", `fx${s.index}_mote`],
]);
const reset = (duration) => FX_CHANNELS.map(([target, property, value]) => property === "soloActive"
  ? soloAt(target, [[0, value], [duration, value]])
  : ch(target, property, [[0, value], [duration, value, E.hold]]));

// Replacing a shot keys the whole six-node pool, including inactive particles.
// Every shot ends with the pool invisible and all transforms restored.
function effect(name, duration, entries) {
  const tracks = new Map(reset(duration).map((t) => [`${t.target}|${t.property}`, t]));
  for (const { slot, kind, start, life, x = 0, y, dx = 0, dy, size = 1, opacity = 0.85, spin = 0, fall = false, radius = 1 } of entries) {
    const s = FX_SLOTS[slot];
    const peak = start + 5, end = start + life, tail = end - 8;
    const key = (property, values) => {
      // Start/end poses reset even when a particle has a delayed emission.
      const rest = property.startsWith("scale") ? 1 : 0;
      const keys = [[0, rest], ...(start > 0 ? [[start, values[0][1], E.hold]] : []), ...values.filter(([f]) => f > start),
        ...(end < duration ? [[duration, rest, E.hold]] : [])];
      if (start === 0) keys[0][1] = values[0][1];
      tracks.set(`${s.particle}|${property}`, ch(s.particle, property, keys));
    };
    key("x", [[start, x], [peak, x + dx * 0.18, E.out], [tail, x + dx * 0.85, E.move], [end, 0, E.hold]]);
    key("y", [[start, y], [peak, y + dy * 0.12, E.out], [tail, y + dy * 0.85 + (fall ? 12 : 0), fall ? E.in : E.out], [end, 0, E.hold]]);
    key("scaleX", [[start, size * 0.2 / radius], [peak, size * 1.08 / radius, E.back], [tail, size * 0.72 / radius, E.out], [end, 1, E.hold]]);
    key("scaleY", [[start, size * 0.2], [peak, size, E.out], [tail, size * 0.72, E.out], [end, 1, E.hold]]);
    key("rotation", [[start, 0], [tail, spin, E.move], [end, 0, E.hold]]);
    key("opacity", [[start, 0], [peak, opacity, E.out], [tail, opacity * 0.45, E.in], [end, 0, E.in]]);
    tracks.set(`${s.solo}|soloActive`, soloAt(s.solo, [[0, `fx${slot}_${kind}`], [duration, `fx${slot}_mote`]]));
    tracks.set(`${s.emitter}|scaleX`, ch(s.emitter, "scaleX", [[0, radius], [duration, 1, E.hold]]));
  }
  return oneShot(name, duration, [...tracks.values()]);
}

export function buildEffects() {
  return [
    { key: "sparkles", trigger: "fxSparkles", anim: effect("fx_sparkles", 66, [
      { slot: 0, kind: "spark", start: 2, life: 40, y: -102, dx: -22, dy: -38, size: 2.1, spin: -12 },
      { slot: 5, kind: "spark", start: 7, life: 40, y: -116, dx: 18, dy: -32, size: 1.8, spin: 10 },
      { slot: 1, kind: "spark", start: 17, life: 42, y: -157, dx: -18, dy: -28, size: 1.5, spin: -8 },
      { slot: 4, kind: "spark", start: 22, life: 40, y: -149, dx: 16, dy: -31, size: 1.6, spin: 8 },
    ]) },
    { key: "motes", trigger: "fxMotes", anim: effect("fx_motes", 108, FX_SLOTS.map((s, i) => ({
      slot: i, kind: "mote", start: 4 + i * 7, life: 62, y: -146 - (i % 3) * 13,
      dx: (i < 3 ? -1 : 1) * (8 + i * 2), dy: -49 - (i % 2) * 10,
      size: 1 + (i % 3) * 0.18, opacity: 0.85, spin: (i % 2 ? 1 : -1) * 18,
    }))) },
    { key: "sweat", trigger: "fxSweat", anim: effect("fx_sweat", 78, [
      { slot: 5, kind: "drop", start: 3, life: 67, y: -103, dx: 5, dy: 49, size: 1.9, opacity: 0.9, spin: 7, fall: true },
    ]) },
    { key: "dust", trigger: "fxDust", anim: effect("fx_dust", 48, [0, 1, 2, 4, 5].map((i, n) => ({
      slot: i, kind: "dust", start: 1 + n * 2, life: 33, y: 146 + n % 2 * 2,
      dx: (i < 3 ? -1 : 1) * (20 + n * 3), dy: -17 - n % 2 * 6,
      size: 1.6 + n % 2 * 0.25, opacity: 0.8, spin: (i < 3 ? -1 : 1) * 13, radius: 0.58, fall: true,
    }))) },
  ];
}
export const buildEffectIdle = () => pose("fx_idle", FX_CHANNELS.map(([target, property, value]) => property === "soloActive"
  ? soloAt(target, [[0, value]]) : ch(target, property, [[0, value]])));
export const buildEffectIntensity = () => [0, 1].map((value) => ({ value,
  anim: pose(`fx_intensity_${value}`, [ch("FxIntensity", "opacity", [[0, value]])]),
}));
