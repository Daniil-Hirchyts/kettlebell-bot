// onboarding_plan — three activity blocks arrive in a sequence, one is singled
// out, one is ticked off, and the plan re-orders itself: the last block finds
// a better place and the others make room.

import { E } from "../motion.mjs";
import { PAL, PT, STAGE, Timeline, Z, anchor, ambient, blink, driftAway, facing, gaze, hop, mascot, popIn } from "./kit.mjs";
import { POSES, bell, card, check, figure, inkFill, merge } from "./props.mjs";

export const NAME = "onboarding_plan";
const D = 420; // 7 s

const M = { x: 548, y: 808, scale: 0.7 };
const SLOT = { w: 472, h: 142, r: 22 * PT, gap: 170 };
const COL = { x: 338, rail: 62 };
const SLOT_Y = [226, 226 + SLOT.gap, 226 + 2 * SLOT.gap];
const SLOT_LEFT = COL.x - SLOT.w / 2;
const BLOCK_H = 124;
const REST_FACING = 18;
const REST_GAZE = gaze(-0.62, -0.62);

/**
 * A plan block. Its length is its duration -- no bars, no text -- and blocks sit
 * left-aligned in their slot, so a block that moves slots keeps its x.
 */
function block(tl, id, { y, w, z, rest, symbol }) {
  const m = `${id}-m`;
  const d = 96;
  return merge(
    anchor(tl, id, { parent: "Stage", x: SLOT_LEFT + 9 + w / 2, y, ...rest }),
    card({ id: `${id}-card`, parent: m, w, h: BLOCK_H, r: 18 * PT, z }),
    {
      groups: [{ id: `${id}-badge`, parent: m, x: -w / 2 + 14 + d / 2, y: 0 }],
      shapes: [
        { id: `${id}-badge-disc`, type: "ellipse", parent: `${id}-badge`, x: 0, y: 0, z: z + 1, width: d, height: d, fill: inkFill(d) },
      ],
    },
    symbol(`${id}-symbol`, `${id}-badge`, z + 2),
  );
}

const W = { A: 300, B: 214, C: 400 };

export function build() {
  const tl = new Timeline(NAME, D);
  const stage = { groups: [{ id: "Stage", x: 0, y: 0 }] };

  // --- the structure: rail, slots, and a node per slot ---------------------
  const structure = merge(
    {
      shapes: [
        {
          id: "rail",
          type: "polygon",
          parent: "Stage",
          x: 0,
          y: 0,
          z: Z.back + 5,
          closed: false,
          points: [{ x: COL.rail, y: SLOT_Y[0] - 50 }, { x: COL.rail, y: SLOT_Y[2] + 50 }],
          stroke: { color: PAL.muted, thickness: 2.5 * PT, cap: "round" },
        },
      ],
    },
    ...SLOT_Y.map((y, i) =>
      merge(
        anchor(tl, `S${i + 1}`, { parent: "Stage", x: COL.x, y, opacity: 0.5, scale: 0.97 }),
        {
          shapes: [
            { id: `S${i + 1}-well`, type: "rect", parent: `S${i + 1}-m`, x: 0, y: 0, z: Z.back + 10, width: SLOT.w, height: SLOT.h, cornerRadius: SLOT.r, fill: { color: PAL.well } },
          ],
        },
        {
          groups: [{ id: `N${i + 1}`, parent: "Stage", x: COL.rail, y }],
          shapes: [
            { id: `N${i + 1}-ring`, type: "ellipse", parent: `N${i + 1}`, x: 0, y: 0, z: Z.back + 20, width: 30, height: 30, fill: { color: PAL.surface }, stroke: { color: PAL.outline, thickness: 2 * PT } },
          ],
        },
        anchor(tl, `N${i + 1}f`, { parent: "Stage", x: COL.rail, y, opacity: 0, scale: 0.2 }),
        { shapes: [{ id: `N${i + 1}f-dot`, type: "ellipse", parent: `N${i + 1}f-m`, x: 0, y: 0, z: Z.back + 21, width: 16, height: 16, fill: { color: PAL.ink } }] },
      ),
    ),
  );

  // --- blocks: kettlebell, upper body, lower body --------------------------
  const blocks = merge(
    block(tl, "A", {
      y: SLOT_Y[0],
      w: W.A,
      z: Z.back + 100,
      rest: { opacity: 0, dy: -150 },
      symbol: (id, parent, z) => bell({ id, parent, y: 15, scale: 0.18, z, tone: "light" }),
    }),
    block(tl, "B", {
      y: SLOT_Y[1],
      w: W.B,
      z: Z.back + 200,
      rest: { opacity: 0, dx: 340, dy: -30, rotation: 8 },
      symbol: (id, parent, z) => figure({ id, parent, y: 42, scale: 0.66, z, pose: POSES.press, color: PAL.light, weight: 1.3 }),
    }),
    block(tl, "C", {
      y: SLOT_Y[2],
      w: W.C,
      z: Z.back + 300,
      rest: { opacity: 0, scale: 0.3, rotation: -8 },
      symbol: (id, parent, z) => figure({ id, parent, y: 34, scale: 0.78, z, pose: POSES.squat, color: PAL.light, weight: 1.3 }),
    }),
  );
  // Emphasis ring rides block B; the tick rides block A, so both travel with
  // their block when the plan re-orders.
  const ring = merge(anchor(tl, "Bring", { parent: "B-m", x: 0, y: 0, opacity: 0, scale: 1.08 }), {
    shapes: [
      {
        id: "Bring-shape",
        type: "rect",
        parent: "Bring-m",
        x: 0,
        y: 0,
        z: Z.back + 250,
        width: W.B + 24,
        height: BLOCK_H + 24,
        cornerRadius: 18 * PT + 12,
        stroke: { color: PAL.ink, thickness: 3 * PT },
      },
    ],
  });
  const tick = merge(anchor(tl, "Atick", { parent: "A-m", x: W.A / 2 - 52, y: 0, opacity: 0, scale: 0.2 }), check({ id: "Atick-badge", parent: "Atick-m", scale: 1.05, z: Z.back + 150 }));

  // --- rest state and ambient life -----------------------------------------
  tl.restPose(REST_GAZE);
  tl.eyes([[0, "pill"], [352, "arc"], [398, "pill"]]);
  ambient(tl, "Touch", "scaleY", { amp: 0.007, cycles: 2 });
  ambient(tl, "Touch", "scaleX", { amp: -0.006, cycles: 2 });
  ambient(tl, "Touch", "y", { amp: 1.4, cycles: 2, phase: 0.2 });
  blink(tl, 96);
  blink(tl, 244);

  // --- 0–40 · the empty slots wake up, top to bottom -----------------------
  SLOT_Y.forEach((_, i) => {
    const m = `S${i + 1}-m`;
    const f = 8 + i * 8;
    tl.keys(m, "opacity", [[f, 0.5, E.hold], [f + 14, 1, E.out]]);
    tl.keys(m, "scaleX", [[f, 0.97, E.hold], [f + 12, 1.015, E.out], [f + 24, 1, E.out]]);
    tl.keys(m, "scaleY", [[f, 0.97, E.hold], [f + 12, 1.03, E.out], [f + 24, 1, E.out]]);
    // ...and go quiet again at the very end of the loop.
    tl.keys(m, "opacity", [[398 + i * 4, 1, E.hold], [414, 0.5, E.in]]);
    tl.keys(m, "scaleX", [[398 + i * 4, 1, E.hold], [414, 0.97, E.in]]);
    tl.keys(m, "scaleY", [[398 + i * 4, 1, E.hold], [414, 0.97, E.in]]);
  });

  // --- 46–90 · block A drops into slot 1 -----------------------------------
  tl.pose(40, REST_GAZE, E.hold);
  tl.pose(48, gaze(-0.5, -1), E.snap); // eyes go up before the block arrives
  tl.keys("A-m", "opacity", [[50, 0, E.hold], [58, 1, E.out]]);
  tl.keys("A-m", "y", [[50, -150, E.hold], [56, -162, E.out], [72, 0, E.in], [80, -12, E.out], [88, 0, E.in]]);
  tl.keys("A-m", "scaleY", [[70, 1.04, E.in], [74, 0.88, E.in], [82, 1.03, E.out], [92, 1, E.out]]);
  tl.keys("A-m", "scaleX", [[70, 0.97, E.in], [74, 1.05, E.in], [82, 0.99, E.out], [92, 1, E.out]]);
  tl.pose(74, gaze(-0.7, -0.92), E.in);
  popIn(tl, "N1f", 72, { rise: 0, spin: 0, over: 1.35 });
  // A small nod lands with the block.
  tl.keys("Char", "y", [[70, 0, E.hold], [78, 5, E.in], [88, -2, E.out], [96, 0, E.out]]);
  tl.keys("Char", "scaleY", [[70, 1, E.hold], [78, 0.96, E.in], [88, 1.02, E.out], [98, 1, E.out]]);

  // --- 104–146 · block B slides in from the right on an arc -----------------
  tl.pose(100, gaze(-0.7, -0.92), E.hold);
  tl.pose(108, gaze(0.3, -0.7), E.snap);
  tl.keys("B-m", "opacity", [[106, 0, E.hold], [116, 1, E.out]]);
  tl.keys("B-m", "x", [[106, 340, E.hold], [134, -14, E.out], [146, 0, E.move]]);
  tl.keys("B-m", "y", [[106, -30, E.hold], [120, -44, E.out], [134, 0, E.in]]);
  tl.keys("B-m", "rotation", [[106, 8, E.hold], [134, -2.4, E.out], [148, 0, E.out]]);
  tl.keys("B-m", "scaleX", [[128, 1, E.hold], [136, 0.95, E.out], [146, 1.01, E.out], [154, 1, E.out]]);
  tl.pose(136, gaze(-0.72, -0.55), E.out);
  popIn(tl, "N2f", 134, { rise: 0, spin: 0, over: 1.35 });

  // --- 156–190 · block C pops into slot 3 -----------------------------------
  tl.pose(150, gaze(-0.72, -0.55), E.hold);
  tl.pose(158, gaze(-0.78, -0.18), E.snap);
  popIn(tl, "C", 162, { rise: 18, spin: -8, over: 1.08, from: 0.3 });
  popIn(tl, "N3f", 170, { rise: 0, spin: 0, over: 1.35 });

  // --- 206–236 · block B is singled out --------------------------------------
  tl.pose(200, gaze(-0.78, -0.18), E.hold);
  tl.pose(208, gaze(-0.66, -0.52), E.snap);
  tl.keys("B-m", "scaleX", [[208, 1, E.hold], [220, 1.05, E.back], [262, 1.05, E.hold], [276, 1, E.move]]);
  tl.keys("B-m", "scaleY", [[208, 1, E.hold], [220, 1.07, E.back], [262, 1.07, E.hold], [276, 1, E.move]]);
  tl.keys("B-m", "y", [[208, 0, E.hold], [220, -8, E.back], [262, -8, E.hold], [276, 0, E.move]]);
  tl.keys("Bring-m", "opacity", [[210, 0, E.hold], [220, 1, E.out], [258, 1, E.hold], [272, 0, E.in]]);
  tl.keys("Bring-m", "scaleX", [[210, 1.08, E.hold], [224, 1, E.out]]);
  tl.keys("Bring-m", "scaleY", [[210, 1.2, E.hold], [224, 1, E.out]]);
  tl.keys("Char", "rotation", [[206, 0, E.hold], [220, -2.5, E.out], [262, -2, E.loop], [280, 0, E.move]]);

  // --- 238–262 · block A is ticked off --------------------------------------
  tl.pose(234, gaze(-0.66, -0.52), E.hold);
  tl.pose(240, gaze(-0.4, -0.95), E.snap);
  popIn(tl, "Atick", 242, { rise: 0, spin: -20, over: 1.25 });
  tl.keys("Atick-badge-tick", "trimEnd", [[250, 0, E.hold], [266, 1, E.out]]);
  tl.rest("Atick-badge-tick", "trimEnd", 0);

  // --- 270–350 · the plan re-orders: eyes check the target first ------------
  tl.pose(266, gaze(-0.4, -0.95), E.hold);
  tl.pose(272, gaze(-0.78, -0.18), E.snap); // at C...
  tl.pose(284, gaze(-0.66, -1), E.snap); // ...where it should go...
  tl.pose(294, gaze(-0.74, -0.2), E.snap); // ...back at C as it lifts
  // C lifts out, arcs up past the others and lands in slot 1.
  tl.keys("C-m", "scaleX", [[292, 1, E.hold], [304, 1.07, E.back], [330, 1.05, E.loop], [340, 0.97, E.in], [348, 1.01, E.out], [356, 1, E.out]]);
  tl.keys("C-m", "scaleY", [[292, 1, E.hold], [304, 1.07, E.back], [330, 1.05, E.loop], [340, 0.92, E.in], [348, 1.02, E.out], [356, 1, E.out]]);
  tl.keys("C-m", "x", [[296, 0, E.hold], [304, 30, E.out], [320, 64, E.move], [338, 0, E.in]]);
  tl.keys("C-m", "y", [[296, 0, E.hold], [304, -12, E.out], [334, -SLOT.gap * 2 - 12, E.move], [340, -SLOT.gap * 2, E.in]]);
  tl.keys("C-m", "rotation", [[296, 0, E.hold], [306, 4, E.out], [326, 2, E.loop], [338, -1.5, E.in], [350, 0, E.out]]);
  // The others step down to make room, a beat behind each other.
  tl.keys("A-m", "y", [[304, 0, E.hold], [310, -4, E.anticipate], [328, SLOT.gap + 6, E.out], [338, SLOT.gap, E.out]]);
  tl.keys("B-m", "y", [[310, 0, E.hold], [316, -4, E.anticipate], [334, SLOT.gap + 6, E.out], [344, SLOT.gap, E.out]]);
  tl.pose(322, gaze(-0.62, -1), E.move);

  // --- 348–400 · the bot is pleased -----------------------------------------
  hop(tl, 348, { height: 24, lean: -2.4, handle: 0.8 });
  tl.pose(350, gaze(-0.62, -1), E.hold);
  tl.pose(360, gaze(-0.1, -0.2), E.move);
  tl.keys("EyeLSolo", "y", [[350, 0, E.hold], [356, -3, E.out], [392, -3, E.hold], [398, 0, E.out]]);
  tl.keys("EyeRSolo", "y", [[350, 0, E.hold], [356, -3, E.out], [392, -3, E.hold], [398, 0, E.out]]);

  // --- 384–420 · the plan folds away into its slots -------------------------
  const fold = (id, f) => {
    const m = `${id}-m`;
    // The fold does the work; opacity only goes once the card is a sliver, so
    // its shadow layers never show through a half-transparent face.
    tl.keys(m, "opacity", [[f, 1, E.hold], [f + 10, 1, E.hold], [f + 16, 0, E.in]]);
    tl.keys(m, "scaleY", [[f, 1, E.hold], [f + 4, 1.04, E.out], [f + 16, 0.08, E.in]]);
    tl.keys(m, "scaleX", [[f, 1, E.hold], [f + 16, 0.96, E.in]]);
  };
  fold("C", 384);
  fold("A", 388);
  fold("B", 392);
  // Invisible: park each block back where it enters from.
  tl.keys("C-m", "y", [[401, -SLOT.gap * 2, E.hold], [402, 0, E.hold]]);
  tl.keys("C-m", "scaleX", [[402, 0.3, E.hold]]);
  tl.keys("C-m", "scaleY", [[402, 0.3, E.hold]]);
  tl.keys("C-m", "rotation", [[402, -8, E.hold]]);
  tl.keys("A-m", "y", [[405, SLOT.gap, E.hold], [406, -150, E.hold]]);
  tl.keys("B-m", "y", [[409, SLOT.gap, E.hold], [410, -30, E.hold]]);
  tl.keys("B-m", "x", [[410, 340, E.hold]]);
  tl.keys("B-m", "rotation", [[410, 8, E.hold]]);
  tl.keys("A-m", "scaleY", [[405, 0.08, E.hold], [406, 1, E.hold]]);
  tl.keys("A-m", "scaleX", [[405, 0.96, E.hold], [406, 1, E.hold]]);
  tl.keys("B-m", "scaleY", [[409, 0.08, E.hold], [410, 1, E.hold]]);
  tl.keys("B-m", "scaleX", [[409, 0.96, E.hold], [410, 1, E.hold]]);
  tl.keys("Atick-m", "opacity", [[404, 1, E.hold], [405, 0, E.hold]]);
  tl.keys("Atick-badge-tick", "trimEnd", [[404, 1, E.hold], [405, 0, E.hold]]);
  ["N1f", "N2f", "N3f"].forEach((id, i) => driftAway(tl, id, 390 + i * 4, { dy: 0, to: 0.2, length: 14 }));
  tl.pose(380, gaze(-0.1, -0.2), E.hold);
  tl.pose(410, REST_GAZE, E.move);

  facing(tl, [
    { frame: 0, facing: REST_FACING },
    { frame: 100, facing: REST_FACING, ease: "linear" },
    { frame: 116, facing: 4, ease: "out", dyn: { lean: -1 } },
    { frame: 142, facing: REST_FACING, ease: "inOut" },
    { frame: 290, facing: REST_FACING, ease: "linear" },
    { frame: 312, facing: 26, ease: "out", dyn: { lean: 1.6, lift: -3 } },
    { frame: 340, facing: 24, ease: "linear", dyn: { lean: 1.4, lift: -3 } },
    { frame: 356, facing: 0, ease: "inOut" },
    { frame: 392, facing: 0, ease: "linear" },
    { frame: D, facing: REST_FACING, ease: "inOut" },
  ]);

  const parts = merge(stage, structure, blocks, ring, tick, mascot(M));
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
