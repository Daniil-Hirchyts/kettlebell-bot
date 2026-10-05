// Kettlebell Bot — build-time guards.
//
// The rig depends on a rule about who may key what: a state-machine layer keys
// only the (object, property) channels it owns. Most layers own their channels
// outright. Reactions override moods, turn shots override the held facing, and
// optional eye poses override glyph selection. The LATER layer wins, only safe
// if it can also get out of the way. Rule 8 enforces that half of the bargain.
// Both halves are checked here because a broken composition is very hard to see
// in a filmstrip.

import { TURN_CHANNELS, turnPose } from "./turn.mjs";
import { EYE_VARIANTS, EYE_Y, bodyHalfWidthAt } from "./geometry.mjs";
import { FX_CHANNELS } from "./effects.mjs";

const MOOD_TARGETS = ["Char", "BodyPivot", "HandlePivot", "Face", "EyeLSolo", "EyeRSolo"];

export function ownershipFor(meta) {
  const turn = new Set(TURN_CHANNELS.map(([t, p]) => `${t}|${p}`));
  const moodAllowed = (track) => MOOD_TARGETS.includes(track.target);

  const rules = [];
  const add = (layer, anims, test) => rules.push({ layer, anims: anims.map((a) => a.name ?? a), test });

  add("Mood", meta.moods.map((m) => m.anim), moodAllowed);
  add("Reaction", meta.reactions.map((r) => r.anim), moodAllowed);
  const turnOwned = (track) => turn.has(`${track.target}|${track.property}`);
  add("Turn", [...meta.facingPoses.map((p) => p.anim), ...meta.yawLoops.map((y) => y.anim)], turnOwned);
  add("Turn Shot", meta.turnShots.map((t) => t.anim), turnOwned);
  add("Gaze X", meta.gaze.x.map((g) => g.anim), (t) => t.target === "GazeX");
  add("Gaze Y", meta.gaze.y.map((g) => g.anim), (t) => t.target === "GazeY");
  add("Energy", meta.energy.map((e) => e.anim), (t) => t.target === "Energy");
  add("Touch", [meta.touch.rest, meta.touch.hover, meta.touch.press], (t) => t.target === "Touch");
  add("Blink", meta.blinks.map((b) => b.anim), (t) => t.target === "EyeLBlink" || t.target === "EyeRBlink");
  add("Eyes", meta.eyeExpressions.map((e) => e.anim), (t) => ["EyeLSolo", "EyeRSolo"].includes(t.target) && t.property === "soloActive");
  const fxOwned = new Set(FX_CHANNELS.map(([t, p]) => `${t}|${p}`));
  add("Effects", [...meta.effects.map((e) => e.anim), meta.effectIdle], (t) => fxOwned.has(`${t.target}|${t.property}`));
  add("Effects Intensity", meta.effectIntensity.map((e) => e.anim), (t) => t.target === "FxIntensity" && t.property === "opacity");
  return rules;
}

export function validateScene(scene, meta) {
  const errors = [];
  const warnings = [];
  const byName = new Map(scene.animations.map((a) => [a.name, a]));

  // 1 · layer channel ownership
  for (const rule of ownershipFor(meta)) {
    for (const name of rule.anims) {
      const anim = byName.get(name);
      if (!anim) {
        errors.push(`layer ${rule.layer}: missing animation ${name}`);
        continue;
      }
      for (const track of anim.tracks) {
        if (!rule.test(track)) {
          errors.push(`layer ${rule.layer}: ${name} keys ${track.target}.${track.property}, which it does not own`);
        }
      }
    }
  }

  // 2 · loop safety — a looping track must return to where it started
  for (const anim of scene.animations) {
    if (anim.loop !== "loop" || anim.duration <= 1) continue;
    for (const track of anim.tracks) {
      if (track.property === "soloActive") continue;
      const first = track.keyframes[0];
      const last = track.keyframes.at(-1);
      if (track.property === "fillColor" ? first.color !== last.color : Math.abs(first.value - last.value) > 1e-6) {
        errors.push(`${anim.name}: ${track.target}.${track.property} loops from ${first.value} to ${last.value}`);
      }
      if (last.frame > anim.duration) {
        errors.push(`${anim.name}: ${track.target}.${track.property} keyframe ${last.frame} exceeds duration ${anim.duration}`);
      }
    }
  }

  // 3 · unique channels, strictly ordered keys and bounded one-shot duration
  for (const anim of scene.animations) {
    const channels = new Set();
    for (const track of anim.tracks) {
      const channel = `${track.target}|${track.property}`;
      if (channels.has(channel)) errors.push(`${anim.name}: duplicate channel ${track.target}.${track.property}`);
      channels.add(channel);
      let previous = -1;
      for (const kf of track.keyframes) {
        if (track.property === "fillColor" && !/^#[\da-f]{6}([\da-f]{2})?$/i.test(kf.color ?? "")) {
          errors.push(`${anim.name}: ${track.target} has invalid color ${kf.color}`);
        } else if (track.property !== "fillColor" && track.property !== "soloActive" && !Number.isFinite(kf.value)) {
          errors.push(`${anim.name}: ${track.target}.${track.property} needs a finite value`);
        }
        if (kf.frame <= previous) {
          errors.push(`${anim.name}: ${track.target}.${track.property} has non-increasing frame ${kf.frame}`);
        }
        previous = kf.frame;
      }
      if (previous > anim.duration) {
        errors.push(`${anim.name}: ${track.target}.${track.property} ends at ${previous} past duration ${anim.duration}`);
      }
    }
  }

  // 4 · solo references and track targets must exist
  const shapeIds = new Set(scene.shapes.map((s) => s.id));
  const groupIds = new Set(scene.groups.map((g) => g.id));
  const shapesById = new Map(scene.shapes.map((s) => [s.id, s]));
  for (const anim of scene.animations) {
    for (const track of anim.tracks) {
      if (track.property === "soloActive") {
        if (!groupIds.has(track.target)) errors.push(`${anim.name}: solo group ${track.target} missing`);
        for (const kf of track.keyframes) {
          if (!shapeIds.has(kf.ref) && !groupIds.has(kf.ref)) {
            errors.push(`${anim.name}: solo ref ${kf.ref} missing`);
          }
        }
        continue;
      }
      const base = track.target.split("#")[0];
      if (track.property === "fillColor" && !shapesById.get(base)?.fill?.color) {
        errors.push(`${anim.name}: ${track.target} has no solid fill to recolor`);
      }
      if (!shapeIds.has(base) && !groupIds.has(base)) {
        errors.push(`${anim.name}: track target ${track.target} missing`);
      }
    }
  }

  // 5 · rest-pose integrity
  //
  // Rive writes keyed x/y absolutely, so animating a node that carries a rest
  // offset silently teleports it to the origin. Two rules keep that impossible:
  // delta-authored layers may only translate nodes parked at (0, 0), and the
  // neutral facing pose must reproduce the rig's own static values.
  const groupById = new Map(scene.groups.map((g) => [g.id, g]));
  const deltaLayers = new Set(["Mood", "Reaction", "Gaze X", "Gaze Y", "Energy", "Touch", "Blink", "Effects"]);
  for (const rule of ownershipFor(meta)) {
    if (!deltaLayers.has(rule.layer)) continue;
    for (const name of rule.anims) {
      const anim = byName.get(name);
      if (!anim) continue;
      for (const track of anim.tracks) {
        if (track.property !== "x" && track.property !== "y") continue;
        const node = groupById.get(track.target);
        if (node && (node[track.property] ?? 0) !== 0) {
          errors.push(
            `${name}: ${track.target}.${track.property} is delta-authored but the node rests at ` +
              `${node[track.property]} — move the offset onto a parent node`,
          );
        }
      }
    }
  }
  const neutralPose = byName.get("face_000");
  if (neutralPose) {
    for (const track of neutralPose.tracks) {
      const node = groupById.get(track.target);
      if (!node) continue;
      const statics = { x: node.x ?? 0, y: node.y ?? 0, scaleX: node.scaleX ?? 1, scaleY: node.scaleY ?? 1, rotation: node.rotation ?? 0, opacity: node.opacity ?? 1 };
      if (!(track.property in statics)) continue;
      const posed = track.keyframes[0].value;
      if (Math.abs(statics[track.property] - posed) > 0.01) {
        errors.push(
          `face_000: ${track.target}.${track.property} poses to ${posed} but the rig rests at ` +
            `${statics[track.property]} — the neutral facing must match the static rig`,
        );
      }
    }
  }

  // 6 · stroke-only paths must stay stroke-only
  //
  // An open path with a fill gets its endpoints joined and the chord flooded.
  // Editors that round-trip the scene like to add a default fill to a
  // stroke-only shape, so this is asserted rather than assumed.
  for (const shape of scene.shapes) {
    if (shape.closed === false && shape.fill) {
      errors.push(
        `shape ${shape.id} is an open path but carries a fill (${JSON.stringify(shape.fill)}) — ` +
          `open paths are stroke-only, a fill floods the chord`,
      );
    }
  }

  // 7 · motion quality: no transform track may be entirely linear or unhinted
  for (const anim of scene.animations) {
    if (anim.duration <= 1) continue;
    for (const track of anim.tracks) {
      if (track.property === "soloActive") continue;
      const eased = track.keyframes.slice(1).filter((k) => k.easing && k.easing !== "linear");
      if (track.keyframes.length > 1 && eased.length === 0) {
        warnings.push(`${anim.name}: ${track.target}.${track.property} has no easing (reads robotic)`);
      }
    }
  }

  // 8 · a layer that overrides an earlier one must be able to yield
  //
  // Two layers may key the same channel deliberately — the later one wins, which
  // is how a reaction plays over a mood and a turn shot plays over the held
  // facing. That only works if the overriding layer can step back out of the
  // way, and the only way it can is for its entry state to run an animation with
  // no tracks at all. Give it anything else and it pins those channels forever:
  // the layer underneath is authored, blended and then never seen again.
  const animTracks = new Map(scene.animations.map((a) => [a.name, a.tracks]));
  const layerChannels = (layer) => {
    const channels = new Set();
    for (const state of layer.states) {
      const names = state.blend1d ? state.blend1d.animations.map((a) => a.animation) : [state.animation];
      for (const name of names) {
        for (const track of animTracks.get(name) ?? []) channels.add(`${track.target}|${track.property}`);
      }
    }
    return channels;
  };
  const layers = scene.stateMachine.layers;
  const sets = layers.map(layerChannels);
  for (let j = 0; j < layers.length; j += 1) {
    const overrides = [];
    for (let i = 0; i < j; i += 1) {
      if ([...sets[j]].some((c) => sets[i].has(c))) overrides.push(layers[i].name);
    }
    if (!overrides.length) continue;
    const entry = layers[j].transitions.find((t) => t.from === "entry");
    const idle = layers[j].states.find((st) => st.name === entry?.to);
    const tracks = idle && !idle.blend1d ? animTracks.get(idle.animation) : undefined;
    if (!idle || idle.blend1d || !tracks || tracks.length > 0) {
      errors.push(
        `layer ${layers[j].name} shares channels with ${overrides.join(", ")} but its entry state ` +
          `${entry?.to ?? "(none)"} is not a track-free idle — it can never yield those channels back`,
      );
    }
  }

  // 9 · the eyes must stay on the bell, and must reach its edge at profile
  //
  // The eyes are decals on the body, so the turn model has exactly two ways to
  // be wrong about them and both have shipped. Ride too small a circle and an
  // eye floats inside the form at profile, which reads as a face painted on a
  // surface that isn't there. Ride too large a one and the eye swings off the
  // outline mid-turn -- and because FaceRoot is clipped to body-mask, that
  // failure is *silent*: the eye is trimmed away instead of drawn in the wrong
  // place, and every pixel assertion about turned-away frames still passes.
  //
  // Both are pure geometry, so both are settled here rather than by looking.
  // Each variant is measured on its own bounding box: the widest eye is also one
  // of the shortest, so pairing the widest width with the tallest height would
  // fail a shape that does not exist.
  const eyeBoxes = EYE_VARIANTS.map((v) => ({
    key: v.key,
    halfW: v.kind === "rect" || v.kind === "ellipse" ? v.width / 2 : Math.max(...v.points.map((p) => Math.abs(p.x))),
    halfH: v.kind === "rect" || v.kind === "ellipse" ? v.height / 2 : Math.max(...v.points.map((p) => Math.abs(p.y))),
  }));
  let worstOverhang = { over: -Infinity };
  let profileReach = 0;
  for (let deg = 0; deg <= 360; deg += 1) {
    const pose = turnPose(deg);
    const squeeze = pose["BodyPlate|scaleX"];
    for (const side of ["L", "R"]) {
      if (pose[`Eye${side}|opacity`] < 0.05) continue;
      const cx = Math.abs(pose[`Eye${side}|x`]);
      for (const box of eyeBoxes) {
        const half = box.halfW * pose[`Eye${side}|scaleX`];
        for (let y = EYE_Y - box.halfH; y <= EYE_Y + box.halfH; y += 2) {
          const rim = bodyHalfWidthAt(y) * squeeze;
          const over = cx + half - rim;
          if (over > worstOverhang.over) worstOverhang = { over, deg, side, y, key: box.key };
        }
      }
      if (deg === 90 || deg === 270) {
        profileReach = Math.max(profileReach, cx / (bodyHalfWidthAt(EYE_Y) * squeeze));
      }
    }
  }
  // The clip absorbs a few units of corner on the tallest variants; it must not
  // be doing structural work.
  if (worstOverhang.over > 4) {
    errors.push(
      `eye leaves the body silhouette by ${worstOverhang.over.toFixed(1)} at facing ${worstOverhang.deg} ` +
        `(Eye${worstOverhang.side}, variant ${worstOverhang.key}, y=${worstOverhang.y}) — body-mask would ` +
        `silently trim it away; lower BELL_RADIUS_X`,
    );
  }
  if (profileReach < 0.85) {
    errors.push(
      `at profile the eye reaches only ${(profileReach * 100).toFixed(0)}% of the body's half-width — ` +
        `it reads as floating inside the form; raise BELL_RADIUS_X`,
    );
  }

  // 10 · each particle shot replaces the entire pool and resets it at exit.
  for (const { anim } of meta.effects) {
    const keyed = new Map(anim.tracks.map((t) => [`${t.target}|${t.property}`, t]));
    for (const [target, property, rest] of FX_CHANNELS) {
      const track = keyed.get(`${target}|${property}`);
      if (!track) { errors.push(`${anim.name}: incomplete particle reset for ${target}.${property}`); continue; }
      const first = track.keyframes[0], last = track.keyframes.at(-1);
      if (first.frame !== 0 || last.frame !== anim.duration || (property === "soloActive" ? last.ref !== rest : last.value !== rest)) {
        errors.push(`${anim.name}: incomplete particle reset for ${target}.${property}`);
      }
      if (property === "opacity" && first.value !== 0) errors.push(`${anim.name}: particle starts visible at ${target}`);
    }
  }
  return { errors, warnings };
}
