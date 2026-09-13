// onboarding_character_intro — the bot notices you, lifts, meets two training
// objects, does a happy hop and settles back where it started.

import { E } from "../motion.mjs";
import { STAGE, Timeline, Z, anchor, blink, driftAway, facing, gaze, hop, mascot, popIn, ambient } from "./kit.mjs";
import { bell, merge, plate, sparkle } from "./props.mjs";

export const NAME = "onboarding_character_intro";
const D = 408; // 6.8 s

const M = { x: 360, y: 626, scale: 1 };
const IDLE_GAZE = gaze(-0.34, 0.36);

export function build() {
  const tl = new Timeline(NAME, D);
  const stage = { groups: [{ id: "Stage", x: 0, y: 0 }] };

  // --- props ---------------------------------------------------------------
  // A: the kettlebell that pops in beside the bot. B: a plate that floats past
  // overhead. C: three sparkles for the hop. All start and end hidden.
  const propA = merge(
    anchor(tl, "A", { parent: "Stage", x: 604, y: 500, opacity: 0, scale: 0.2 }),
    bell({ id: "A-bell", parent: "A-m", scale: 0.33, z: Z.front + 10 }),
  );
  const propB = merge(
    anchor(tl, "B", { parent: "Stage", x: 360, y: 210, opacity: 0, scale: 0.7, dx: -230, dy: 70 }),
    plate({ id: "B-plate", parent: "B-m", r: 62, z: Z.back + 10 }),
  );
  const sparks = [
    { id: "C1", x: 164, y: 452, s: 1.4, spin: -30 },
    { id: "C2", x: 238, y: 318, s: 1.1, spin: 24 },
    { id: "C3", x: 520, y: 300, s: 1.2, spin: 30 },
  ];
  const propC = merge(
    ...sparks.map((c) =>
      merge(
        anchor(tl, c.id, { parent: "Stage", x: c.x, y: c.y, opacity: 0, scale: 0.2 }),
        sparkle({ id: `${c.id}-star`, parent: `${c.id}-m`, scale: c.s, z: Z.front + 20, color: "#6F7178" }),
      ),
    ),
  );

  // --- 0–46 · idle ---------------------------------------------------------
  // Calm, eyes resting down and to the side. Breath lives on Touch for the whole
  // loop, so it never stops and never syncs with the acting on Char.
  ambient(tl, "Touch", "scaleY", { amp: 0.007, cycles: 2, phase: 0 });
  ambient(tl, "Touch", "scaleX", { amp: -0.006, cycles: 2, phase: 0 });
  ambient(tl, "Touch", "y", { amp: 1.6, cycles: 2, phase: 0.2 });
  tl.restPose(IDLE_GAZE);
  tl.eyes([[0, "pill"], [94, "arc"], [128, "pill"], [300, "arc"], [352, "pill"]]);
  blink(tl, 22);

  // --- 46–58 · notices the viewer: eyes first ------------------------------
  tl.pose(46, IDLE_GAZE, E.hold);
  tl.pose(56, gaze(0, -0.08), E.snap);
  tl.keys("EyeLSolo", "scaleY", [[46, 1, E.hold], [53, 1.18, E.snap], [72, 1.06, E.out], [90, 1.06, E.hold], [96, 1, E.out]]);
  tl.keys("EyeRSolo", "scaleY", [[47, 1, E.hold], [54, 1.18, E.snap], [73, 1.06, E.out], [90, 1.06, E.hold], [96, 1, E.out]]);
  tl.keys("EyeLSolo", "scaleX", [[46, 1, E.hold], [53, 1.08, E.snap], [72, 1, E.out]]);
  tl.keys("EyeRSolo", "scaleX", [[47, 1, E.hold], [54, 1.08, E.snap], [73, 1, E.out]]);

  // --- 60–100 · then the body: anticipation, lift, friendly tilt -----------
  tl.keys("Char", "y", [[60, 0, E.hold], [68, 6, E.in], [88, -22, E.out], [100, -18, E.loop], [130, -20, E.loop], [160, -16, E.loop]]);
  tl.keys("Char", "scaleY", [[60, 1, E.hold], [68, 0.93, E.in], [82, 1.05, E.out], [98, 1, E.out]]);
  tl.keys("Char", "scaleX", [[60, 1, E.hold], [68, 1.07, E.in], [82, 0.96, E.out], [98, 1, E.out]]);
  tl.keys("Char", "rotation", [[60, 0, E.hold], [70, 1.2, E.in], [92, -4.2, E.out], [112, -3.4, E.loop], [150, -1, E.move]]);
  tl.keys("HandlePivot", "rotation", [[62, 0, E.hold], [74, -4, E.out], [94, 6, E.out], [112, -2.4, E.out], [134, 0.8, E.loop], [160, 0, E.loop]]);
  tl.keys("HandlePivot", "y", [[62, 0, E.hold], [74, 5, E.out], [92, -6, E.out], [114, 1, E.out], [140, 0, E.loop]]);
  tl.keys("ShadowScale", "scaleX", [[60, 1, E.hold], [68, 1.05, E.in], [88, 0.8, E.out], [160, 0.82, E.loop]]);
  tl.keys("ShadowScale", "opacity", [[60, 1, E.hold], [88, 0.66, E.out], [160, 0.7, E.loop]]);
  // The friendly squint lands at the top of the lift.
  tl.keys("EyeLSolo", "y", [[90, 0, E.hold], [96, -3, E.out], [126, -3, E.hold], [132, 0, E.out]]);
  tl.keys("EyeRSolo", "y", [[90, 0, E.hold], [96, -3, E.out], [126, -3, E.hold], [132, 0, E.out]]);

  // --- 114–150 · a kettlebell pops in; eyes glance, body follows -----------
  popIn(tl, "A", 114, { rise: 34, spin: -22 });
  tl.keys("A-m", "y", [[170, -7, E.loop], [214, 2, E.loop], [256, -5, E.loop], [300, 0, E.loop]]);
  tl.keys("A-m", "rotation", [[190, 3, E.loop], [250, -2, E.loop], [300, 0, E.loop]]);
  tl.pose(118, gaze(0, -0.08), E.hold);
  tl.pose(126, gaze(0.9, 0.12), E.snap);

  // --- 170–256 · a plate floats past overhead; eyes track, body lags -------
  tl.keys("B-m", "opacity", [[170, 0, E.hold], [186, 1, E.out], [238, 1, E.hold], [256, 0, E.in]]);
  // Crosses the top band left to right on a shallow arc, clear of the
  // kettlebell at the bot's side. A coin-like wobble on x gives it depth.
  tl.keys("B-m", "x", [[170, -230, E.hold], [256, 230, E.move]]);
  tl.keys("B-m", "y", [[170, 70, E.hold], [214, -10, E.out], [256, 40, E.in]]);
  tl.keys("B-m", "rotation", [[170, -60, E.hold], [256, 170, E.move]]);
  tl.keys("B-m", "scaleX", [[170, 0.7, E.hold], [194, 1, E.out], [216, 0.72, E.loop], [238, 0.98, E.loop], [256, 0.8, E.in]]);
  tl.keys("B-m", "scaleY", [[170, 0.7, E.hold], [196, 1, E.out], [256, 0.84, E.in]]);
  tl.pose(166, gaze(0.9, 0.12), E.hold);
  tl.pose(178, gaze(-0.82, -0.9), E.snap);
  tl.pose(214, gaze(0, -1), E.loop);
  tl.pose(250, gaze(0.82, -0.86), E.loop);
  tl.pose(262, gaze(0.82, -0.86), E.hold);
  tl.pose(276, gaze(0, -0.1), E.move);
  // Float comes down before the hop so the hop starts from the ground.
  tl.keys("Char", "y", [[232, -18, E.loop], [276, 0, E.move]]);
  tl.keys("Char", "rotation", [[276, 0, E.move]]);
  tl.keys("ShadowScale", "scaleX", [[232, 0.82, E.loop], [276, 1, E.move]]);
  tl.keys("ShadowScale", "opacity", [[232, 0.7, E.loop], [276, 1, E.move]]);

  facing(tl, [
    { frame: 0, facing: 0 },
    { frame: 128, facing: 0, ease: "linear" },
    { frame: 156, facing: 26, ease: "out", dyn: { lean: -2 } },
    { frame: 178, facing: 26, ease: "linear", dyn: { lean: -2 } },
    { frame: 198, facing: -24, ease: "inOut", dyn: { lean: 2.2 } },
    { frame: 210, facing: -21, ease: "linear", dyn: { lean: 2 } },
    { frame: 256, facing: 24, ease: "inOut", dyn: { lean: -2.2 } },
    { frame: 266, facing: 22, ease: "linear", dyn: { lean: -2 } },
    { frame: 288, facing: 0, ease: "outBack" },
    { frame: D, facing: 0, ease: "linear" },
  ]);

  // --- 292–352 · small happy hop, sparkles at the top ----------------------
  hop(tl, 292, { height: 38, lean: 3.4 });
  tl.keys("EyeLSolo", "y", [[298, 0, E.hold], [304, -3, E.out], [346, -3, E.hold], [352, 0, E.out]]);
  tl.keys("EyeRSolo", "y", [[298, 0, E.hold], [304, -3, E.out], [346, -3, E.hold], [352, 0, E.out]]);
  sparks.forEach((c, i) => {
    const at = 304 + i * 4;
    popIn(tl, c.id, at, { rise: 12, spin: c.spin, over: 1.2 });
    driftAway(tl, c.id, at + 34, { dy: -18, to: 0.2, spin: c.spin * 0.6, length: 18 });
  });

  // --- 350–380 · the kettlebell drifts off; the bot settles ----------------
  driftAway(tl, "A", 352, { dy: -40, to: 0.5, spin: 12 });
  tl.pose(356, gaze(0, -0.1), E.hold);
  tl.pose(388, IDLE_GAZE, E.move);

  const bot = mascot(M);
  const parts = merge(stage, propA, propB, propC, bot);
  return {
    artboard: { name: NAME, width: STAGE.width, height: STAGE.height },
    groups: parts.groups,
    shapes: parts.shapes,
    animations: [tl.build()],
    stateMachine: {
      name: "Onboarding",
      inputs: [],
      layers: [{ name: "Loop", states: [{ name: "Play", animation: NAME }], transitions: [{ from: "entry", to: "Play", durationMs: 0 }] }],
    },
  };
}
