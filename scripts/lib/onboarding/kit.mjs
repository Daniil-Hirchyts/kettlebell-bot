// Kettlebell Bot — onboarding hero kit: stage, palette, the embedded mascot,
// and the timeline every onboarding loop is authored on.
//
// The mascot is not redrawn here. Its groups and shapes come straight from
// scene.mjs, so the onboarding heroes and the avatar can never drift apart;
// this module only places it on a portrait stage and gives it a ground.

import { BODY_BOTTOM, COLOR } from "../geometry.mjs";
import { E, FPS } from "../motion.mjs";
import { buildGroups, buildShapes } from "../scene.mjs";
import { sampleFacing, turnTracks } from "../turn.mjs";

// 3:4 portrait. The app shows it at roughly 390 pt wide, so one design-token
// point is about PT artboard units; token radii and strokes are scaled by it.
export const STAGE = { width: 720, height: 960 };
export const PT = 1.8;

// Two-value brand treatment: the mascot's charcoal and its off-white light, with
// the light-scheme surfaces from riv_design_tokens (seed #1B1D22, mood "tech")
// for the structures the props sit on. No new hues.
export const PAL = {
  ink: COLOR.bodyTop,
  inkDeep: COLOR.bodyBottom,
  inkRaised: COLOR.backDetail,
  light: COLOR.eye,
  rim: COLOR.rim,
  surface: "#FFFFFF",
  well: "#E2E8F6",
  outline: "#BEC4D2",
  muted: "#CCCED1",
  primary: "#6F7178",
  shade: "#1E2129",
  invisible: COLOR.invisible,
};

// Draw-order bands. Mascot shapes keep their own relative z inside theirs.
export const Z = { back: 0, shadow: 900, mascot: 1000, front: 2000 };

// ---------------------------------------------------------------------------
// Mascot
// ---------------------------------------------------------------------------

/**
 * The avatar rig, placed on the stage, plus a soft ground shadow.
 *
 * Energy carries locomotion (x only) and the shadow rides it, so the shadow
 * follows the bot sideways but stays on the ground when Char hops.
 */
export function mascot({ x, y, scale }) {
  const groups = buildGroups().map((g) => (g.id === "Root" ? { ...g, x, y, scaleX: scale, scaleY: scale } : g));
  groups.push(
    // A circle squashed by its group, so the radial gradient squashes with it
    // and the shadow fades out on every side instead of ending in a flat edge.
    { id: "MascotShadow", parent: "Energy", x: 0, y: BODY_BOTTOM + 4, scaleY: 0.13 },
    { id: "ShadowScale", parent: "MascotShadow", x: 0, y: 0, opacity: 1 },
  );
  const shapes = buildShapes().map((s) => ({ ...s, z: Z.mascot + (s.z ?? 0) }));
  shapes.push({
    id: "mascot-shadow",
    type: "ellipse",
    parent: "ShadowScale",
    x: 0,
    y: 0,
    z: Z.shadow,
    width: 340,
    height: 340,
    fill: {
      gradient: {
        type: "radial",
        start: { x: 0, y: 0 },
        end: { x: 0, y: 170 },
        stops: [
          { color: "#3A05070B", position: 0 },
          { color: "#1C05070B", position: 0.55 },
          { color: "#0005070B", position: 1 },
        ],
      },
    },
  });
  return { groups, shapes };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const key = (target, property) => `${target}|${property}`;

/**
 * Loop timeline. Every channel has a rest value it starts on and returns to,
 * so a loop cannot end somewhere other than where it began: `build` closes each
 * channel back to rest at the last frame and refuses one that does not.
 */
export class Timeline {
  constructor(name, duration) {
    this.name = name;
    this.duration = duration;
    this.channels = new Map();
    this.solos = new Map();
    this.raw = [];
  }

  /** Declare a channel's rest value (defaults: 1 for scale/opacity, else 0). */
  rest(target, property, value) {
    this.channel(target, property).rest = value;
    return this;
  }

  channel(target, property) {
    const k = key(target, property);
    if (!this.channels.has(k)) {
      const unit = property.startsWith("scale") || property === "opacity" || property === "trimEnd";
      this.channels.set(k, { target, property, rest: unit ? 1 : 0, keys: new Map() });
    }
    return this.channels.get(k);
  }

  /** `tl.keys("Char", "y", [[frame, value, easing], ...])` — easing arrives at the key. */
  keys(target, property, list) {
    const c = this.channel(target, property);
    for (const [frame, value, easing] of list) {
      if (!Number.isInteger(frame) || frame < 0 || frame > this.duration) {
        throw new Error(`${this.name}: ${target}.${property} frame ${frame} outside 0..${this.duration}`);
      }
      c.keys.set(frame, [frame, value, easing]);
    }
    return this;
  }

  /** Key a whole pose map { "Target|prop": value } at one frame. */
  pose(frame, values, easing = E.loop) {
    for (const [k, value] of Object.entries(values)) {
      const [target, property] = k.split("|");
      this.keys(target, property, [[frame, value, easing]]);
    }
    return this;
  }

  /** Set a pose map as the rest values. */
  restPose(values) {
    for (const [k, value] of Object.entries(values)) {
      const [target, property] = k.split("|");
      this.rest(target, property, value);
    }
    return this;
  }

  /** Solo switches; the first entry must be at frame 0 and match the last. */
  solo(group, entries) {
    this.solos.set(group, entries);
    return this;
  }

  eyes(entries) {
    this.solo("EyeLSolo", entries.map(([f, v]) => [f, `eyeL_${v}`]));
    this.solo("EyeRSolo", entries.map(([f, v]) => [f, `eyeR_${v}`]));
    return this;
  }

  /**
   * Fill colour keys on a solid-filled shape: `[[frame, "#RRGGBB", easing]]`.
   * The first entry is the rest colour, and the loop closes back to it.
   */
  colors(target, list) {
    this.colorTracks = this.colorTracks ?? new Map();
    const current = this.colorTracks.get(target) ?? [];
    this.colorTracks.set(target, [...current, ...list]);
    return this;
  }

  /** Pre-built tracks (the turn model's dense samples). */
  tracks(list) {
    this.raw.push(...list);
    return this;
  }

  build() {
    const d = this.duration;
    const tracks = [];
    const rawKeys = new Set(this.raw.map((t) => key(t.target, t.property)));
    for (const c of this.channels.values()) {
      if (rawKeys.has(key(c.target, c.property))) {
        throw new Error(`${this.name}: ${c.target}.${c.property} is keyed twice`);
      }
      const keys = [...c.keys.values()].sort((a, b) => a[0] - b[0]);
      if (!keys.length || keys[0][0] !== 0) keys.unshift([0, c.rest]);
      // Closing to rest is a hold, never a slow ease: an ease would quietly
      // drift a visible object back over the whole gap. A hold that changes the
      // value is a jump, which validateLoop only accepts while it is invisible.
      if (keys.at(-1)[0] !== d) keys.push([d, c.rest, E.hold]);
      if (Math.abs(keys[0][1] - c.rest) > 1e-9 || Math.abs(keys.at(-1)[1] - c.rest) > 1e-9) {
        throw new Error(`${this.name}: ${c.target}.${c.property} must start and end on its rest value ${c.rest}`);
      }
      tracks.push({
        target: c.target,
        property: c.property,
        keyframes: keys.map(([frame, value, easing], i) => ({
          frame,
          value: Number(value.toFixed(4)),
          ...(i === 0 ? {} : { easing: easing ?? E.loop }),
        })),
      });
    }
    for (const [group, entries] of this.solos) {
      const sorted = [...entries].sort((a, b) => a[0] - b[0]);
      if (sorted[0][0] !== 0) throw new Error(`${this.name}: ${group} solo must start at frame 0`);
      tracks.push({ target: group, property: "soloActive", keyframes: sorted.map(([frame, ref]) => ({ frame, ref })) });
    }
    for (const [target, list] of this.colorTracks ?? []) {
      const sorted = [...list].sort((a, b) => a[0] - b[0]);
      if (sorted[0][0] !== 0) throw new Error(`${this.name}: ${target} colour must start at frame 0`);
      if (sorted.at(-1)[0] !== d) sorted.push([d, sorted[0][1], E.hold]);
      tracks.push({
        target,
        property: "fillColor",
        keyframes: sorted.map(([frame, color, easing], i) => ({ frame, color, ...(i === 0 ? {} : { easing: easing ?? E.loop }) })),
      });
    }
    tracks.push(...this.raw);
    return { name: this.name, fps: FPS, duration: d, loop: "loop", tracks };
  }
}

// ---------------------------------------------------------------------------
// Acting vocabulary shared by all four heroes
// ---------------------------------------------------------------------------

/**
 * Where the eyes point, as the avatar's own gaze poses (turnanims.mjs) plus a
 * little of the Face node so a look reads at hero size. -1..1 on both axes,
 * positive y is down.
 */
export function gaze(gx, gy) {
  return {
    "GazeX|x": 21 * gx,
    "GazeX|rotation": 2.8 * gx,
    "GazeX|scaleX": 1 - 0.08 * Math.abs(gx),
    "GazeY|y": gy < 0 ? 15 * gy : 16 * gy,
    "GazeY|scaleY": gy < 0 ? 1 - 0.1 * gy : 1 - 0.16 * gy,
    "Face|x": 9 * gx,
    "Face|y": 5 * gy,
  };
}

/** A lid blink on the Blink nodes, so it composes with any eye acting. */
export function blink(tl, frame, { offset = 1 } = {}) {
  const close = (f) => [
    [f, 1, E.hold],
    [f + 3, 0.07, E.in],
    [f + 5, 0.07, E.hold],
    [f + 8, 1.08, E.out],
    [f + 11, 1, E.out],
  ];
  tl.keys("EyeLBlink", "scaleY", close(frame));
  tl.keys("EyeRBlink", "scaleY", close(frame + offset));
}

/**
 * A hop on Char with anticipation, stretch, hang, landing squash and one
 * settling rebound; the handle lags and overshoots the body. Returns the
 * frame the body is settled on.
 */
export function hop(tl, start, { height = 30, lean = 0, handle = 1 } = {}) {
  const f = (n) => start + n;
  tl.keys("Char", "y", [
    [f(0), 0, E.hold], [f(8), 7, E.in], [f(20), -height, E.out], [f(26), -height * 0.9, E.loop],
    [f(36), 3, E.in], [f(44), -height * 0.16, E.out], [f(52), 0, E.in],
  ]);
  tl.keys("Char", "scaleY", [
    [f(0), 1, E.hold], [f(8), 0.9, E.in], [f(18), 1.08, E.out], [f(28), 1.01, E.loop],
    [f(37), 0.9, E.in], [f(45), 1.02, E.out], [f(56), 1, E.out],
  ]);
  tl.keys("Char", "scaleX", [
    [f(0), 1, E.hold], [f(8), 1.1, E.in], [f(18), 0.94, E.out], [f(28), 0.995, E.loop],
    [f(37), 1.1, E.in], [f(45), 0.985, E.out], [f(56), 1, E.out],
  ]);
  if (lean) {
    tl.keys("Char", "rotation", [[f(0), 0, E.hold], [f(8), -lean * 0.5, E.in], [f(22), lean, E.out], [f(38), -lean * 0.4, E.in], [f(56), 0, E.out]]);
  }
  tl.keys("HandlePivot", "rotation", [
    [f(0), 0, E.hold], [f(12), 5 * handle, E.out], [f(26), -8 * handle, E.in], [f(40), 5 * handle, E.out], [f(50), -2 * handle, E.out], [f(60), 0, E.out],
  ]);
  tl.keys("HandlePivot", "y", [[f(0), 0, E.hold], [f(12), 6, E.out], [f(26), -7, E.in], [f(40), 4, E.out], [f(60), 0, E.out]]);
  // The ground shadow tightens and fades while the bot is in the air.
  const air = Math.min(1, height / 40);
  tl.keys("ShadowScale", "scaleX", [[f(0), 1, E.hold], [f(8), 1.06, E.in], [f(20), 1 - 0.3 * air, E.out], [f(26), 1 - 0.27 * air, E.loop], [f(36), 1.06, E.in], [f(52), 1, E.out]]);
  tl.keys("ShadowScale", "opacity", [[f(0), 1, E.hold], [f(20), 1 - 0.45 * air, E.out], [f(26), 1 - 0.4 * air, E.loop], [f(36), 1, E.in]]);
  return f(60);
}

/**
 * Dense turn-model tracks for a facing curve. The curve must end on the facing
 * and dynamics it started on, which is what makes it loop.
 */
export function facing(tl, keys, step = 3) {
  const first = keys[0];
  const last = keys.at(-1);
  const same = (a, b) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
  if (first.frame !== 0 || last.frame !== tl.duration || (last.facing - first.facing) % 360 !== 0 || !same(first.dyn, last.dyn)) {
    throw new Error(`${tl.name}: a facing curve must run 0..${tl.duration} and end on the facing it started on`);
  }
  tl.tracks(turnTracks(sampleFacing(keys, step)));
}

/** Seamless ambient wave for a channel (whole cycles across the loop). */
export function ambient(tl, target, property, { amp, cycles = 1, phase = 0, base = null, steps = 8 }) {
  const c = tl.channel(target, property);
  const rest = base ?? c.rest;
  const total = steps * cycles;
  const list = [];
  for (let i = 0; i <= total; i += 1) {
    const frame = Math.round((i / total) * tl.duration);
    list.push([frame, rest + amp * Math.sin(2 * Math.PI * ((cycles * i) / total + phase)), E.loop]);
  }
  c.rest = list[0][1];
  list[list.length - 1][1] = list[0][1];
  tl.keys(target, property, list);
}

// ---------------------------------------------------------------------------
// Props on the stage
// ---------------------------------------------------------------------------

/**
 * A static anchor at a stage position and a mover under it at the origin.
 * Scenes key only the mover, so keyed x/y (absolute in Rive) are offsets from
 * the anchor and a prop's layout lives in exactly one place.
 */
export function anchor(tl, id, { parent, x, y, opacity = 1, scale = 1, rotation = 0, dx = 0, dy = 0 }) {
  const m = `${id}-m`;
  tl.rest(m, "opacity", opacity).rest(m, "scaleX", scale).rest(m, "scaleY", scale).rest(m, "rotation", rotation);
  tl.rest(m, "x", dx).rest(m, "y", dy);
  return {
    groups: [
      { id, parent, x, y },
      { id: m, parent: id, x: dx, y: dy, opacity, scaleX: scale, scaleY: scale, ...(rotation ? { rotation } : {}) },
    ],
  };
}

/**
 * Entrance: quick acceleration into a soft overshoot. Starts from the mover's
 * rest (small and invisible) and ends on identity.
 */
export function popIn(tl, id, frame, { rise = 26, spin = -16, over = 1.12, from = 0.2 } = {}) {
  const m = `${id}-m`;
  const f = (n) => frame + n;
  tl.keys(m, "opacity", [[f(0), 0, E.hold], [f(7), 1, E.out]]);
  tl.keys(m, "scaleX", [[f(0), from, E.hold], [f(13), over, E.out], [f(21), 0.97, E.in], [f(29), 1, E.out]]);
  tl.keys(m, "scaleY", [[f(0), from, E.hold], [f(12), over + 0.03, E.out], [f(20), 0.95, E.in], [f(28), 1, E.out]]);
  tl.keys(m, "y", [[f(0), rise, E.hold], [f(13), -5, E.out], [f(26), 0, E.loop]]);
  tl.keys(m, "rotation", [[f(0), spin, E.hold], [f(14), -spin * 0.22, E.out], [f(30), 0, E.out]]);
  return f(30);
}

/** Exit: a slightly faster move with a clean ease-out of opacity. */
export function driftAway(tl, id, frame, { dx = 0, dy = -44, to = 0.55, spin = 0, length = 22 } = {}) {
  const m = `${id}-m`;
  const f = (n) => frame + n;
  // Opacity holds until the prop has mostly shrunk away: a prop built from
  // overlapping shapes would otherwise show its hidden parts through itself.
  tl.keys(m, "opacity", [[f(0), 1, E.hold], [f(Math.round(length * 0.45)), 1, E.hold], [f(length), 0, E.in]]);
  tl.keys(m, "scaleX", [[f(0), 1, E.hold], [f(length), to, E.in]]);
  tl.keys(m, "scaleY", [[f(0), 1, E.hold], [f(length), to, E.in]]);
  tl.keys(m, "y", [[f(0), 0, E.hold], [f(length), dy, E.exit]]);
  if (dx) tl.keys(m, "x", [[f(0), 0, E.hold], [f(length), dx, E.exit]]);
  if (spin) tl.keys(m, "rotation", [[f(0), 0, E.hold], [f(length), spin, E.exit]]);
  return f(length);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const TRANSFORM = new Set(["x", "y", "rotation", "scaleX", "scaleY"]);

/** Value of a keyed channel at a frame: holds step, everything else is read linearly. */
export function valueAt(track, frame) {
  const kf = track.keyframes;
  if (frame <= kf[0].frame) return kf[0].value;
  for (let i = 1; i < kf.length; i += 1) {
    const b = kf[i];
    if (frame > b.frame) continue;
    const a = kf[i - 1];
    if (b.easing === "hold") return frame === b.frame ? b.value : a.value;
    return a.value + ((b.value - a.value) * (frame - a.frame)) / (b.frame - a.frame || 1);
  }
  return kf.at(-1).value;
}

/** Structural checks for a single-artboard onboarding loop. */
export function validateLoop(scene) {
  const nodes = new Map([...scene.groups, ...scene.shapes].map((n) => [n.id, n]));
  // Effective opacity of an object at a frame: its own and every ancestor's.
  const visibility = (anim, target, frame) => {
    const tracks = new Map(anim.tracks.filter((t) => t.property === "opacity").map((t) => [t.target, t]));
    let id = target.split("#")[0];
    let alpha = 1;
    while (id && nodes.has(id)) {
      const node = nodes.get(id);
      const track = tracks.get(id);
      alpha *= track ? valueAt(track, frame) : node.opacity ?? 1;
      id = node.parent;
    }
    return alpha;
  };
  const errors = [];
  const warnings = [];
  const shapes = new Map(scene.shapes.map((s) => [s.id, s]));
  const groups = new Set(scene.groups.map((g) => g.id));
  const ids = new Set();
  for (const item of [...scene.groups, ...scene.shapes]) {
    if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
    ids.add(item.id);
  }
  for (const s of scene.shapes) {
    if (s.clipBy && !shapes.has(s.clipBy)) errors.push(`${s.id} clips by missing ${s.clipBy}`);
    const open = s.closed === false || (s.subpaths ?? []).some((sp) => sp.closed === false);
    if (open && s.fill) errors.push(`${s.id}: open path carries a fill`);
  }
  for (const g of scene.groups) {
    if (g.parent && !groups.has(g.parent)) errors.push(`group ${g.id} parent ${g.parent} missing`);
  }
  if ((scene.texts ?? []).length) errors.push("onboarding heroes carry no text");

  for (const anim of scene.animations) {
    if (anim.loop !== "loop") errors.push(`${anim.name} must loop`);
    const seconds = anim.duration / anim.fps;
    if (seconds < 5 || seconds > 7) errors.push(`${anim.name}: ${seconds.toFixed(2)} s is outside the 5-7 s brief`);
    for (const track of anim.tracks) {
      const name = `${anim.name}: ${track.target}.${track.property}`;
      const kf = track.keyframes;
      const base = track.target.split("#")[0];
      if (!shapes.has(base) && !groups.has(base)) errors.push(`${name}: target missing`);
      let previous = -1;
      for (const k of kf) {
        if (k.frame <= previous) errors.push(`${name}: frame ${k.frame} not increasing`);
        previous = k.frame;
      }
      if (previous > anim.duration) errors.push(`${name}: ends past the loop`);
      if (track.property === "soloActive") {
        if (kf[0].frame !== 0) errors.push(`${name}: no solo key at frame 0`);
        if (kf.at(-1).ref !== kf[0].ref) errors.push(`${name}: loop seam switches solo child`);
        for (const k of kf) if (!shapes.has(k.ref) && !groups.has(k.ref)) errors.push(`${name}: ref ${k.ref} missing`);
        continue;
      }
      if (track.property === "fillColor") {
        if (kf[0].color !== kf.at(-1).color) errors.push(`${name}: loops from ${kf[0].color} to ${kf.at(-1).color}`);
        for (let i = 1; i < kf.length; i += 1) {
          if (kf[i].easing === "hold" && kf[i].color !== kf[i - 1].color && Math.max(visibility(anim, track.target, kf[i].frame - 1), visibility(anim, track.target, kf[i].frame)) > 0.02) {
            errors.push(`${name}: colour jumps at frame ${kf[i].frame} while visible`);
          }
        }
        continue;
      }
      if (Math.abs(kf[0].value - kf.at(-1).value) > 1e-6) errors.push(`${name}: loops from ${kf[0].value} to ${kf.at(-1).value}`);
      for (let i = 1; i < kf.length; i += 1) {
        const k = kf[i];
        if (TRANSFORM.has(track.property) && (!k.easing || k.easing === "linear")) {
          errors.push(`${name}: linear segment into frame ${k.frame}`);
        }
        if (k.easing === "hold" && Math.abs(k.value - kf[i - 1].value) > 1e-6) {
          // A trimmed stroke is invisible while its start and end coincide.
          if (track.property.startsWith("trim")) {
            const other = anim.tracks.find((t) => t.target === track.target && t.property.startsWith("trim") && t.property !== track.property);
            const empty = (f) => !other || Math.abs(valueAt(track, f) - valueAt(other, f)) < 1e-6;
            if (empty(k.frame - 1) && empty(k.frame)) continue;
          }
          const seen = Math.max(visibility(anim, track.target, k.frame - 1), visibility(anim, track.target, k.frame));
          if (seen > 0.02) errors.push(`${name}: jumps ${kf[i - 1].value} -> ${k.value} at frame ${k.frame} while visible (${seen.toFixed(2)})`);
        }
      }
    }
  }
  return { errors, warnings };
}
