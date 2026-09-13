// onboarding_discovery — a stack of exercise cards fans out; one lights up a
// muscle group, one produces its equipment, one is loved, grows into focus and
// its figure does a single kettlebell swing, which the bot can't help copying.

import { HANDLE_CY, HANDLE_OUTER } from "../geometry.mjs";
import { E } from "../motion.mjs";
import { PAL, PT, STAGE, Timeline, Z, anchor, ambient, blink, driftAway, facing, gaze, mascot, popIn } from "./kit.mjs";
import { POSES, bell, bodyMap, card, figure, heart, keyFigure, merge, restFigure, dumbbell } from "./props.mjs";

export const NAME = "onboarding_discovery";
const D = 420; // 7 s

const M = { x: 176, y: 792, scale: 0.64 };
const STACK = { x: 384, y: 436 };
const CARD = { w: 238, h: 314, r: 22 * PT };
// Where each card sits in the pile and in the fan, as offsets from STACK.
const PILE = { K1: [-12, 10, -5], K2: [0, 0, 0], K3: [12, 12, 4] };
const FAN = { K1: [-160, 26, -10], K2: [0, -16, 0], K3: [160, 26, 10] };
const REST_GAZE = gaze(0.55, -0.72);
const REST_FACING = -16;

// The swing figure's poses; the bell hangs off the hands along the arm. It
// rests in a ready stance -- soft knees, split feet, bell hanging in front --
// because a straight side-on figure reads as a letter, not a person.
const HANG = {
  ...POSES.swingTop,
  head: [7, -88], neck: [3, -69], hip: [-3, -37], shoulderB: [3, -69], shoulderF: [3, -69],
  elbowB: [9, -53], handB: [11, -38], elbowF: [9, -53], handF: [11, -38],
  kneeB: [-7, -19], footB: [-13, 0], kneeF: [6, -19], footF: [11, 0],
};
const BELL_SCALE = 0.1;
const HANDLE_REACH = -(HANDLE_CY + HANDLE_OUTER[0].y) * BELL_SCALE; // bell centre to handle top
function bellAt(pose) {
  const [sx, sy] = pose.shoulderF;
  const [hx, hy] = pose.handF;
  const len = Math.hypot(hx - sx, hy - sy) || 1;
  const ax = (hx - sx) / len;
  const ay = (hy - sy) / len;
  return { x: hx + ax * HANDLE_REACH, y: hy + ay * HANDLE_REACH, rotation: (Math.atan2(-ax, ay) * 180) / Math.PI };
}

function exerciseCard(tl, id, z, content) {
  const [dx, dy, rotation] = PILE[id];
  return merge(
    anchor(tl, id, { parent: "Stage", x: STACK.x, y: STACK.y, dx, dy, rotation }),
    card({ id: `${id}-card`, parent: `${id}-m`, w: CARD.w, h: CARD.h, r: CARD.r, z }),
    content(`${id}-m`, z + 1),
    {
      // Veil: fades a supporting card back when another takes focus.
      shapes: [
        { id: `${id}-veil`, type: "rect", parent: `${id}-m`, x: 0, y: 0, z: z + 5, width: CARD.w, height: CARD.h, cornerRadius: CARD.r, opacity: 0, fill: { color: PAL.surface } },
      ],
    },
  );
}

const ground = (id, parent, z, y = 112, w = 150) => ({
  shapes: [{ id, type: "ellipse", parent, x: 0, y, z, width: w, height: 22, fill: { color: PAL.well } }],
});

export function build() {
  const tl = new Timeline(NAME, D);
  const stage = { groups: [{ id: "Stage", x: 0, y: 0 }] };

  // --- cards ----------------------------------------------------------------
  const k1 = exerciseCard(tl, "K1", Z.back + 100, (parent, z) =>
    merge(ground("K1-ground", parent, z, 118, 130), bodyMap({ id: "K1-body", parent, y: 36, scale: 0.76, z: z + 1, regions: ["core", "legs"] })),
  );
  const k3 = exerciseCard(tl, "K3", Z.back + 300, (parent, z) =>
    merge(ground("K3-ground", parent, z), figure({ id: "K3-fig", parent, x: 8, y: 112, scale: 2.1, z: z + 1, pose: POSES.lunge })),
  );
  const k2 = exerciseCard(tl, "K2", Z.back + 500, (parent, z) =>
    merge(
      ground("K2-ground", parent, z),
      figure({ id: "K2-fig", parent, x: -14, y: 112, scale: 2.1, z: z + 1, pose: HANG }),
      { groups: [{ id: "K2-bellpos", parent: "K2-fig", ...bellAt(HANG) }] },
      bell({ id: "K2-bell", parent: "K2-bellpos", scale: BELL_SCALE, z: z + 2 }),
    ),
  );
  // Equipment rises out from behind K3's top edge.
  const k3bell = merge(
    anchor(tl, "K3gear", { parent: "K3-m", x: -22, y: 0, opacity: 0, scale: 0.6, dy: -30 }),
    dumbbell({ id: "K3gear-shape", parent: "K3gear-m", size: 1.9, z: Z.back + 299 }),
  );
  const loved = merge(
    anchor(tl, "K2heart", { parent: "K2-m", x: CARD.w / 2 - 44, y: -CARD.h / 2 + 44, opacity: 0, scale: 0.2 }),
    heart({ id: "K2heart-badge", parent: "K2heart-m", scale: 0.62, z: Z.back + 520 }),
  );

  // --- rest and ambient -------------------------------------------------------
  tl.restPose(REST_GAZE);
  restFigure(tl, "K2-fig", HANG);
  const rest = bellAt(HANG);
  tl.rest("K2-bellpos", "x", rest.x).rest("K2-bellpos", "y", rest.y).rest("K2-bellpos", "rotation", rest.rotation);
  for (const id of ["K1", "K2", "K3"]) tl.rest(`${id}-veil`, "opacity", 0);
  for (const region of ["core", "legs"]) tl.rest(`K1-body-glow-${region}`, "opacity", 0);
  tl.eyes([[0, "pill"], [170, "round"], [206, "pill"], [336, "arc"], [372, "pill"]]);
  ambient(tl, "Touch", "scaleY", { amp: 0.008, cycles: 2 });
  ambient(tl, "Touch", "scaleX", { amp: -0.007, cycles: 2 });
  ambient(tl, "Touch", "y", { amp: 1.6, cycles: 2, phase: 0.2 });
  blink(tl, 26);
  blink(tl, 232);

  // --- 36–86 · the stack fans out -------------------------------------------
  const moveCard = (id, from, to, f, length, easing, overshoot = 0) => {
    const m = `${id}-m`;
    const [fx, fy, fr] = from;
    const [tx, ty, tr] = to;
    const mid = f + Math.round(length * 0.72);
    tl.keys(m, "x", [[f, fx, E.hold], [mid, tx + (tx - fx) * overshoot, easing], [f + length, tx, E.move]]);
    tl.keys(m, "y", [[f, fy, E.hold], [f + Math.round(length * 0.4), Math.min(fy, ty) - 14 * Math.sign(Math.abs(tx - fx)), E.out], [f + length, ty, E.in]]);
    tl.keys(m, "rotation", [[f, fr, E.hold], [mid, tr + (tr - fr) * overshoot, easing], [f + length, tr, E.move]]);
  };
  tl.pose(38, REST_GAZE, E.hold);
  // A small lift of the whole stack first: anticipation for the fan.
  tl.keys("K2-m", "scaleX", [[36, 1, E.hold], [44, 0.97, E.in], [54, 1.02, E.out], [66, 1, E.out]]);
  tl.keys("K2-m", "scaleY", [[36, 1, E.hold], [44, 1.03, E.in], [54, 0.99, E.out], [66, 1, E.out]]);
  moveCard("K1", PILE.K1, FAN.K1, 46, 30, E.out, 0.06);
  moveCard("K3", PILE.K3, FAN.K3, 50, 30, E.out, 0.06);
  tl.keys("K2-m", "y", [[46, 0, E.hold], [58, FAN.K2[1] - 6, E.out], [72, FAN.K2[1], E.move]]);
  tl.pose(56, gaze(0.12, -1), E.snap);
  tl.pose(76, gaze(0.92, -0.62), E.snap);
  tl.keys("Char", "rotation", [[40, 0, E.hold], [54, -3, E.out], [82, 1.6, E.move], [104, 0, E.move]]);

  // --- 96–150 · browsing: K3 passes forward while K1 recedes ----------------
  tl.keys("K3-m", "scaleX", [[96, 1, E.hold], [110, 1.08, E.back], [132, 1.08, E.hold], [148, 1, E.move]]);
  tl.keys("K3-m", "scaleY", [[96, 1, E.hold], [110, 1.08, E.back], [132, 1.08, E.hold], [148, 1, E.move]]);
  tl.keys("K3-m", "y", [[96, FAN.K3[1], E.hold], [110, FAN.K3[1] + 16, E.back], [132, FAN.K3[1] + 16, E.hold], [148, FAN.K3[1], E.move]]);
  tl.keys("K1-m", "scaleX", [[100, 1, E.hold], [116, 0.93, E.move], [132, 0.93, E.hold], [150, 1, E.move]]);
  tl.keys("K1-m", "scaleY", [[100, 1, E.hold], [116, 0.93, E.move], [132, 0.93, E.hold], [150, 1, E.move]]);
  tl.keys("K1-veil", "opacity", [[100, 0, E.hold], [116, 0.45, E.move], [132, 0.45, E.hold], [150, 0, E.move]]);

  // --- 152–210 · a muscle group lights up on K1 -------------------------------
  tl.pose(146, gaze(0.92, -0.62), E.hold);
  tl.pose(154, gaze(-0.05, -1), E.snap);
  tl.keys("K1-body-glow-legs", "opacity", [[158, 0, E.hold], [168, 1, E.out], [196, 1, E.hold], [214, 0, E.in]]);
  tl.keys("K1-body-glow-core", "opacity", [[164, 0, E.hold], [174, 1, E.out], [200, 1, E.hold], [218, 0, E.in]]);
  tl.keys("EyeLSolo", "scaleY", [[166, 1, E.hold], [172, 1.14, E.out], [204, 1.14, E.hold], [210, 1, E.out]]);
  tl.keys("EyeRSolo", "scaleY", [[167, 1, E.hold], [173, 1.14, E.out], [204, 1.14, E.hold], [210, 1, E.out]]);

  // --- 208–246 · equipment rises out of K3 -------------------------------------
  tl.pose(204, gaze(-0.05, -1), E.hold);
  tl.pose(212, gaze(0.95, -0.9), E.snap);
  tl.keys("K3gear-m", "opacity", [[210, 0, E.hold], [216, 1, E.out]]);
  tl.keys("K3gear-m", "y", [[210, -30, E.hold], [226, -214, E.out], [236, -196, E.in], [246, -204, E.out], [286, -198, E.loop], [330, -204, E.loop]]);
  tl.keys("K3gear-m", "scaleX", [[210, 0.6, E.hold], [224, 1.06, E.out], [236, 0.98, E.in], [246, 1, E.out]]);
  tl.keys("K3gear-m", "scaleY", [[210, 0.6, E.hold], [222, 1.12, E.out], [236, 0.95, E.in], [246, 1, E.out]]);
  tl.keys("K3gear-m", "rotation", [[210, 0, E.hold], [226, -16, E.out], [242, -8, E.out], [300, -11, E.loop], [340, -9, E.loop]]);

  // --- 246–272 · K2 is loved ----------------------------------------------------
  tl.pose(244, gaze(0.95, -0.9), E.hold);
  tl.pose(252, gaze(0.52, -1), E.snap);
  popIn(tl, "K2heart", 254, { rise: 10, spin: -24, over: 1.3 });
  tl.keys("Char", "y", [[258, 0, E.hold], [266, 4, E.in], [276, -6, E.out], [286, 0, E.out]]);
  tl.keys("Char", "scaleY", [[258, 1, E.hold], [266, 0.95, E.in], [276, 1.04, E.out], [288, 1, E.out]]);
  tl.keys("Char", "scaleX", [[258, 1, E.hold], [266, 1.04, E.in], [276, 0.97, E.out], [288, 1, E.out]]);

  // --- 276–300 · K2 grows into focus, the others step back ----------------------
  const focusY = FAN.K2[1] - 40;
  tl.keys("K2-m", "scaleX", [[276, 1, E.hold], [284, 0.97, E.in], [298, 1.24, E.out], [306, 1.2, E.in], [312, 1.21, E.out]]);
  tl.keys("K2-m", "scaleY", [[276, 1, E.hold], [284, 0.97, E.in], [298, 1.26, E.out], [306, 1.2, E.in], [312, 1.21, E.out]]);
  tl.keys("K2-m", "y", [[276, FAN.K2[1], E.hold], [284, FAN.K2[1] + 6, E.in], [300, focusY - 4, E.out], [310, focusY, E.move]]);
  for (const [id, side] of [["K1", -1], ["K3", 1]]) {
    const [fx] = FAN[id];
    tl.keys(`${id}-m`, "x", [[280, fx, E.hold], [300, fx + side * 26, E.move], [362, fx + side * 26, E.hold], [378, fx, E.move]]);
    tl.keys(`${id}-m`, "scaleX", [[280, 1, E.hold], [300, 0.92, E.move], [362, 0.92, E.hold], [378, 1, E.move]]);
    tl.keys(`${id}-m`, "scaleY", [[280, 1, E.hold], [300, 0.92, E.move], [362, 0.92, E.hold], [378, 1, E.move]]);
    tl.keys(`${id}-veil`, "opacity", [[280, 0, E.hold], [300, 0.5, E.move], [362, 0.5, E.hold], [378, 0, E.move]]);
  }

  // --- 306–362 · one swing; the bot mirrors it a beat late -----------------------
  const rep = [
    [306, HANG, E.hold],
    [320, POSES.swingBottom, E.loop],
    [331, POSES.swingTop, E.out],
    [336, { ...POSES.swingTop, handF: [34, -64], handB: [34, -64], elbowF: [17, -66], elbowB: [17, -66] }, E.out],
    [348, POSES.swingBottom, E.in],
    [362, HANG, E.out],
  ];
  for (const [frame, p, easing] of rep) {
    keyFigure(tl, "K2-fig", frame, p, easing);
    const b = bellAt(p);
    tl.keys("K2-bellpos", "x", [[frame, b.x, easing]]);
    tl.keys("K2-bellpos", "y", [[frame, b.y, easing]]);
    tl.keys("K2-bellpos", "rotation", [[frame, b.rotation, easing]]);
  }
  tl.pose(304, gaze(0.52, -1), E.hold);
  tl.pose(322, gaze(0.46, -0.7), E.loop);
  tl.pose(334, gaze(0.5, -1), E.out);
  tl.pose(350, gaze(0.46, -0.72), E.in);
  tl.pose(364, gaze(0.3, -0.5), E.out);
  // The copy: a squat into the hinge, a stretch at the top.
  tl.keys("Char", "y", [[310, 0, E.hold], [324, 8, E.loop], [336, -12, E.out], [352, 6, E.in], [366, 0, E.out]]);
  tl.keys("Char", "scaleY", [[310, 1, E.hold], [324, 0.92, E.loop], [336, 1.07, E.out], [352, 0.95, E.in], [368, 1, E.out]]);
  tl.keys("Char", "scaleX", [[310, 1, E.hold], [324, 1.07, E.loop], [336, 0.95, E.out], [352, 1.04, E.in], [368, 1, E.out]]);
  tl.keys("HandlePivot", "rotation", [[312, 0, E.hold], [328, 5, E.out], [340, -7, E.out], [356, 4, E.out], [372, 0, E.out]]);
  tl.keys("EyeLSolo", "y", [[334, 0, E.hold], [340, -3, E.out], [368, -3, E.hold], [374, 0, E.out]]);
  tl.keys("EyeRSolo", "y", [[334, 0, E.hold], [340, -3, E.out], [368, -3, E.hold], [374, 0, E.out]]);

  // --- 362–404 · focus lets go, cards restack, the extras tidy away --------------
  tl.keys("K2-m", "scaleX", [[362, 1.21, E.hold], [378, 1, E.move]]);
  tl.keys("K2-m", "scaleY", [[362, 1.21, E.hold], [378, 1, E.move]]);
  tl.keys("K2-m", "y", [[362, focusY, E.hold], [378, FAN.K2[1], E.move], [384, FAN.K2[1], E.hold], [400, 0, E.move]]);
  driftAway(tl, "K2heart", 372, { dy: -14, to: 0.2, length: 16 });
  tl.keys("K3gear-m", "opacity", [[360, 1, E.hold], [380, 0, E.in]]);
  tl.keys("K3gear-m", "y", [[358, -204, E.hold], [380, -40, E.exit]]);
  tl.keys("K3gear-m", "scaleX", [[358, 1, E.hold], [380, 0.6, E.in]]);
  tl.keys("K3gear-m", "scaleY", [[358, 1, E.hold], [380, 0.6, E.in]]);
  tl.keys("K3gear-m", "rotation", [[358, -9, E.hold], [380, 0, E.exit]]);
  const restack = (id, f) => {
    const m = `${id}-m`;
    const [fx, fy, fr] = FAN[id];
    const [px, py, pr] = PILE[id];
    tl.keys(m, "x", [[f, fx, E.hold], [f + 20, px, E.exit]]);
    tl.keys(m, "y", [[f, fy, E.hold], [f + 8, fy - 10, E.out], [f + 20, py, E.exit]]);
    tl.keys(m, "rotation", [[f, fr, E.hold], [f + 20, pr, E.exit]]);
  };
  restack("K3", 382);
  restack("K1", 386);
  // The pile settles with one soft bump.
  tl.keys("K2-m", "scaleY", [[400, 1, E.hold], [405, 0.975, E.out], [414, 1, E.out]]);
  tl.keys("K2-m", "scaleX", [[400, 1, E.hold], [405, 1.02, E.out], [414, 1, E.out]]);
  tl.pose(376, gaze(0.3, -0.5), E.hold);
  tl.pose(396, REST_GAZE, E.move);

  facing(tl, [
    { frame: 0, facing: REST_FACING },
    { frame: 60, facing: REST_FACING, ease: "linear" },
    { frame: 84, facing: -28, ease: "out", dyn: { lean: -1.4 } },
    { frame: 140, facing: -28, ease: "linear", dyn: { lean: -1.4 } },
    { frame: 160, facing: -6, ease: "inOut", dyn: { lift: -2 } },
    { frame: 204, facing: -6, ease: "linear", dyn: { lift: -2 } },
    { frame: 222, facing: -30, ease: "out", dyn: { lean: -1.6 } },
    { frame: 250, facing: -30, ease: "linear", dyn: { lean: -1.6 } },
    { frame: 268, facing: -18, ease: "inOut" },
    { frame: 330, facing: -12, ease: "inOut" },
    { frame: 372, facing: 0, ease: "inOut" },
    { frame: 386, facing: 0, ease: "linear" },
    { frame: D, facing: REST_FACING, ease: "inOut" },
  ]);

  const parts = merge(stage, k1, k3, k2, k3bell, loved, mascot(M));
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
