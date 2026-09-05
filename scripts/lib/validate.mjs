// Kettlebell Bot — build-time guards.
//
// The rig depends on a rule about who may key what: a state-machine layer keys
// only the (object, property) channels it owns. Most layers own their channels
// outright. Two pairs share on purpose — reactions override moods, turn shots
// override the held facing — and there the LATER layer wins, which is only safe
// if it can also get out of the way. Rule 8 enforces that half of the bargain.
// Both halves are checked here because a broken composition is very hard to see
// in a filmstrip.

import { TURN_CHANNELS } from "./turn.mjs";

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
      if (Math.abs(first.value - last.value) > 1e-6) {
        errors.push(`${anim.name}: ${track.target}.${track.property} loops from ${first.value} to ${last.value}`);
      }
      if (last.frame > anim.duration) {
        errors.push(`${anim.name}: ${track.target}.${track.property} keyframe ${last.frame} exceeds duration ${anim.duration}`);
      }
    }
  }

  // 3 · keyframes must be strictly ordered, and one-shots must fit the duration
  for (const anim of scene.animations) {
    for (const track of anim.tracks) {
      let previous = -1;
      for (const kf of track.keyframes) {
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
  const deltaLayers = new Set(["Mood", "Reaction", "Gaze X", "Gaze Y", "Energy", "Touch", "Blink"]);
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

  return { errors, warnings };
}
