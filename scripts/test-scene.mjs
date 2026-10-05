#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildScene } from "./lib/scene.mjs";
import { validateScene } from "./lib/validate.mjs";
import { COLOR, EYE_MAX_HALF, EYE_SCALE, EYE_VARIANTS } from "./lib/geometry.mjs";
import { MOOD_CHANNELS } from "./lib/moods.mjs";
import { FX_SLOTS, FX_CHANNELS, fxTurnPose } from "./lib/effects.mjs";

const { scene, meta } = buildScene();
assert.deepEqual(validateScene(scene, meta), { errors: [], warnings: [] });
assert.equal(scene.artboard.name, "KettlebellBot");
assert.equal(scene.stateMachine.name, "KettlebellBotMachine");
assert.ok(EYE_SCALE >= 1.6, "all eye shapes must be visibly enlarged");
assert.equal(EYE_MAX_HALF.x, 23 * EYE_SCALE);
assert.equal(EYE_MAX_HALF.y, 38 * EYE_SCALE);
assert.deepEqual(EYE_VARIANTS.slice(0, 7).map((v) => v.key), ["pill", "tall", "round", "slit", "arc", "wedge", "star"]);
assert.equal(EYE_VARIANTS.length, 14);
assert.deepEqual(meta.moods.slice(0, 16).map((m) => m.key), ["calm", "curious", "thinking", "working", "bored", "blocked", "sleepy", "focused", "excited", "happy", "proud", "confused", "skeptical", "nervous", "playful", "listening"]);
assert.ok(!scene.stateMachine.inputs.some((i) => i.name === "accent"));
assert.equal(scene.stateMachine.inputs.find((i) => i.name === "eyes").initial, 0);
assert.equal(scene.stateMachine.inputs.find((i) => i.name === "effectsIntensity").initial, 1);
assert.ok(!scene.animations.some((a) => a.tracks.some((t) => t.property === "fillColor")));
assert.ok(scene.shapes.filter((s) => /^eye[LR]_/.test(s.id)).every((s) => s.fill.color === COLOR.eye));
assert.ok(FX_SLOTS.length <= 6);
assert.equal(scene.groups.find((g) => g.id === "FxIntensity").parent, "BodyPivot");
assert.ok(FX_SLOTS.every((s) => fxTurnPose(180)[`${s.projection}|opacity`] === 0));
for (let angle = 0; angle <= 360; angle += 10) {
  const projection = fxTurnPose(angle);
  for (const s of FX_SLOTS) {
    assert.ok(Number.isFinite(projection[`${s.projection}|scaleX`]));
    assert.ok(Math.abs(projection[`${s.projection}|x`]) <= 161);
  }
}
for (const { anim } of meta.effects) assert.equal(anim.tracks.length, FX_CHANNELS.length);
for (const r of meta.reactions.slice(10)) {
  const keyed = new Set(r.anim.tracks.map((t) => `${t.target}|${t.property}`));
  assert.ok(MOOD_CHANNELS.every(([target, property]) => keyed.has(`${target}|${property}`)), `${r.key}: incomplete interruption reset`);
}
const expectFailure = (mutate, match) => {
  const copy = buildScene();
  mutate(copy);
  assert.ok(validateScene(copy.scene, copy.meta).errors.some((e) => match.test(e)), `validator missed ${match}`);
};
expectFailure(({ meta }) => { meta.moods[16].anim.tracks[0].target = "Yaw"; }, /does not own/);
expectFailure(({ meta }) => { meta.moods[17].anim.tracks[0].keyframes.at(-1).value = 999; }, /loop/);
expectFailure(({ meta }) => { meta.reactions[12].anim.tracks.push(structuredClone(meta.reactions[12].anim.tracks[0])); }, /duplicate channel/);
expectFailure(({ scene }) => { scene.animations.find((a) => a.name === "neutral").tracks.push({target:"eyeL_pill", property:"fillColor", keyframes:[{frame:0,color:"bad"}]}); }, /invalid color/);
expectFailure(({ scene }) => { scene.stateMachine.layers.find((l) => l.name === "Reaction").states.find((s) => s.name === "ReactionIdle").animation = meta.moods[0].anim.name; }, /track-free idle/);
expectFailure(({ meta }) => { meta.effects[0].anim.tracks.pop(); }, /incomplete particle reset/);
expectFailure(({ meta }) => { meta.effects[1].anim.tracks.find((t) => t.property === "opacity").keyframes.at(-1).value = 1; }, /incomplete particle reset/);
expectFailure(({ meta }) => { meta.effects[2].anim.tracks[0].target = "Char"; }, /does not own/);
expectFailure(({ scene }) => { scene.stateMachine.layers.find((l) => l.name === "Eyes").states[0].animation = "eyes_wide"; }, /track-free idle/);
console.log("14 off-white eye variants, unchanged geometry, surface-projected effects and complete reset guards: ok");
