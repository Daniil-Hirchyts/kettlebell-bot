// onboarding_progress — from a low-energy start, three bars climb, a streak
// flame catches, a body map lights up muscle by muscle and a line reaches a new
// peak. The bot is proud. Then everything folds back into its starting shapes,
// as a cycle rather than a loss: the line runs on through its peak, the star
// floats off, and the bars rise away and are replaced by fresh stubs.

import { E } from "../motion.mjs";
import { PAL, STAGE, Timeline, Z, anchor, ambient, blink, driftAway, facing, gaze, hop, mascot, popIn } from "./kit.mjs";
import { bodyMap, flame, merge, sparkle } from "./props.mjs";

export const NAME = "onboarding_progress";
const D = 420; // 7 s

const M = { x: 384, y: 814, scale: 0.7 };
const BASE_Y = 598;
const BAR_W = 62;
const STUB = 26;
// Lighter to darker as they climb: effort accumulating into the brand charcoal.
const BARS = [
  { id: "B1", x: 124, h: 104, color: PAL.muted, at: 38, len: 28 },
  { id: "B2", x: 212, h: 182, color: PAL.primary, at: 76, len: 30 },
  { id: "B3", x: 300, h: 276, color: PAL.ink, at: 116, len: 34 },
];
const PEAK = { x: 452, y: 178 };
const BODY = { x: 572, y: 464, scale: 0.9 };
const FLAME = { x: 150, y: 724 };
const REST_GAZE = gaze(-0.5, -0.2);
const REST_FACING = 12;
const SLEEPY = 0.74;

/**
 * One pill per bar, as a single shape: its two top vertices are keyed, so the
 * bar grows without stretching its rounded ends, and fades as one surface
 * instead of showing where caps would overlap a body.
 */
const R = BAR_W / 2;
const topY = (h) => -h - R;
function bar(tl, b) {
  const shape = `${b.id}-pill`;
  tl.rest(`${shape}#p0_0`, "y", topY(STUB)).rest(`${shape}#p0_1`, "y", topY(STUB));
  return merge(anchor(tl, b.id, { parent: "Stage", x: b.x, y: BASE_Y }), {
    shapes: [
      {
        id: shape,
        type: "polygon",
        parent: `${b.id}-m`,
        x: 0,
        y: 0,
        z: Z.back + 50,
        closed: true,
        points: [
          { x: -R, y: topY(STUB), radius: R },
          { x: R, y: topY(STUB), radius: R },
          { x: R, y: R, radius: R },
          { x: -R, y: R, radius: R },
        ],
        fill: { color: PAL.well },
      },
    ],
  });
}

/** Key a bar's height (the distance its top cap centre sits above the base). */
function height(tl, b, list) {
  for (const i of [0, 1]) tl.keys(`${b.id}-pill#p0_${i}`, "y", list.map(([f, h, e]) => [f, topY(h), e]));
}

export function build() {
  const tl = new Timeline(NAME, D);
  const stage = { groups: [{ id: "Stage", x: 0, y: 0 }] };

  const bars = merge(...BARS.map((b) => bar(tl, b)));
  // Not a chart line: a trail that launches off the tallest bar and arcs up
  // to a new peak, where the sparkle lands.
  const top = BARS[2];
  const line = {
    shapes: [
      {
        id: "line",
        type: "polygon",
        parent: "Stage",
        x: 0,
        y: 0,
        z: Z.back + 60,
        closed: false,
        points: [
          { x: top.x, y: BASE_Y - top.h - 62, cubic: { rotation: -90, distance: 58 } },
          { x: PEAK.x - 22, y: PEAK.y + 10, cubic: { rotation: -8, distance: 64 } },
        ],
        stroke: { color: PAL.ink, thickness: 9, cap: "round", join: "round", trim: { start: 0, end: 0 } },
      },
    ],
  };
  tl.rest("line", "trimEnd", 0).rest("line", "trimStart", 0);
  const star = merge(
    anchor(tl, "Burst", { parent: "Stage", x: PEAK.x, y: PEAK.y, opacity: 0, scale: 0.3 }),
    { shapes: [{ id: "Burst-ring", type: "ellipse", parent: "Burst-m", x: 0, y: 0, z: Z.back + 70, width: 110, height: 110, stroke: { color: PAL.primary, thickness: 5 } }] },
    anchor(tl, "Star", { parent: "Stage", x: PEAK.x, y: PEAK.y, opacity: 0, scale: 0.2 }),
    sparkle({ id: "Star-shape", parent: "Star-m", scale: 1.25, z: Z.back + 72 }),
  );
  const body = merge(
    anchor(tl, "Body", { parent: "Stage", x: BODY.x, y: BODY.y, opacity: 0.12, scale: 1 }),
    bodyMap({ id: "Body-map", parent: "Body-m", y: 50 * BODY.scale, scale: BODY.scale, z: Z.back + 80, regions: ["shoulders", "core", "legs"] }),
  );
  tl.rest("Body-m", "scaleX", 0.46);
  for (const r of ["shoulders", "core", "legs"]) tl.rest(`Body-map-glow-${r}`, "opacity", 0);
  const fire = merge(anchor(tl, "F", { parent: "Stage", x: FLAME.x, y: FLAME.y, scale: 0.55 }), flame({ id: "F-flame", parent: "F-m", z: Z.back + 90 }));
  tl.rest("F-flame-core", "scaleX", 0.34).rest("F-flame-core", "scaleY", 0.34);

  // --- rest: low energy ---------------------------------------------------------
  tl.restPose(REST_GAZE);
  tl.rest("EyeLSolo", "scaleY", SLEEPY).rest("EyeRSolo", "scaleY", SLEEPY);
  tl.eyes([[0, "pill"], [318, "arc"], [380, "pill"]]);
  ambient(tl, "Touch", "scaleY", { amp: 0.006, cycles: 2 });
  ambient(tl, "Touch", "scaleX", { amp: -0.005, cycles: 2 });
  ambient(tl, "Touch", "y", { amp: 1.3, cycles: 2, phase: 0.2 });
  blink(tl, 172);
  // The ember breathes even at rest.
  ambient(tl, "F-flame-outer", "scaleY", { amp: 0.05, cycles: 5, steps: 6 });
  ambient(tl, "F-flame-outer", "rotation", { amp: 2.4, cycles: 3, phase: 0.3, steps: 6 });

  // --- 30 · the bot wakes up to it ----------------------------------------------
  tl.keys("EyeLSolo", "scaleY", [[28, SLEEPY, E.hold], [34, 1.14, E.snap], [48, 1, E.out]]);
  tl.keys("EyeRSolo", "scaleY", [[29, SLEEPY, E.hold], [35, 1.14, E.snap], [49, 1, E.out]]);
  tl.pose(28, REST_GAZE, E.hold);

  // --- 38–150 · three bars climb, each higher --------------------------------------
  const gazeFor = [gaze(-0.9, -0.2), gaze(-0.72, -0.55), gaze(-0.52, -0.9)];
  BARS.forEach((b, i) => {
    const f = (n) => b.at + n;
    const peak = f(Math.round(b.len * 0.7));
    const over = b.h + 10 + i * 4;
    height(tl, b, [[f(0), STUB, E.hold], [f(6), STUB - 8, E.in], [peak, over, E.out], [f(b.len), b.h, E.in], [f(b.len + 6), b.h + 2, E.out], [f(b.len + 10), b.h, E.in]]);
    tl.keys(`${b.id}-m`, "scaleX", [[f(0), 1, E.hold], [f(6), 1.1, E.in], [peak, 0.94, E.out], [f(b.len + 6), 1.02, E.in], [f(b.len + 12), 1, E.out]]);
    tl.colors(`${b.id}-pill`, [[0, PAL.well], [f(4), PAL.well, E.hold], [peak, b.color, E.out]]);
    tl.pose(f(-4), i === 0 ? REST_GAZE : gazeFor[i - 1], E.hold);
    tl.pose(f(2), gazeFor[i], E.snap);
  });
  // Body follows the climb: a small lift with each bar.
  tl.keys("Char", "y", [[40, 0, E.hold], [52, -4, E.out], [70, 0, E.move], [80, 0, E.hold], [92, -6, E.out], [110, 0, E.move], [120, 0, E.hold], [134, -9, E.out], [156, 0, E.move]]);
  tl.keys("Char", "scaleY", [[120, 1, E.hold], [134, 1.03, E.out], [156, 1, E.move]]);
  tl.keys("Char", "scaleX", [[120, 1, E.hold], [134, 0.975, E.out], [156, 1, E.move]]);

  // --- 158–190 · the streak flame catches --------------------------------------------
  tl.pose(154, gazeFor[2], E.hold);
  tl.pose(160, gaze(-0.95, 0.6), E.snap);
  tl.keys("F-m", "scaleX", [[160, 0.55, E.hold], [166, 0.5, E.in], [180, 1.36, E.out], [190, 1.2, E.in], [198, 1.24, E.out]]);
  tl.keys("F-m", "scaleY", [[160, 0.55, E.hold], [166, 0.48, E.in], [180, 1.44, E.out], [190, 1.18, E.in], [198, 1.24, E.out]]);
  tl.keys("F-flame-core", "scaleX", [[164, 0.34, E.hold], [184, 1.08, E.out], [196, 1, E.in]]);
  tl.keys("F-flame-core", "scaleY", [[164, 0.34, E.hold], [182, 1.14, E.out], [196, 1, E.in]]);

  // --- 196–228 · the body map turns into view ------------------------------------------
  tl.pose(192, gaze(-0.95, 0.6), E.hold);
  tl.pose(198, gaze(0.9, -0.4), E.snap);
  tl.keys("Body-m", "opacity", [[200, 0.12, E.hold], [214, 1, E.out]]);
  tl.keys("Body-m", "scaleX", [[200, 0.46, E.hold], [220, 1.04, E.out], [230, 1, E.in]]);
  tl.keys("Body-m", "y", [[200, 0, E.hold], [212, -8, E.out], [228, 0, E.in]]);

  // --- 232–266 · muscles light up, one after another -------------------------------------
  ["shoulders", "core", "legs"].forEach((r, i) => {
    const f = 234 + i * 12;
    tl.keys(`Body-map-glow-${r}`, "opacity", [[f, 0, E.hold], [f + 5, 1, E.out], [f + 9, 0.7, E.in], [f + 14, 1, E.out]]);
  });
  tl.pose(234, gaze(0.9, -0.4), E.hold);
  tl.pose(262, gaze(0.86, -0.1), E.move);

  // --- 268–300 · the line runs up the bars to a new peak ------------------------------------
  tl.pose(266, gaze(0.86, -0.1), E.hold);
  tl.pose(272, gaze(-0.4, -1), E.snap);
  tl.pose(298, gaze(0.4, -1), E.move);
  tl.keys("line", "trimEnd", [[272, 0, E.hold], [300, 1, E.move]]);

  // --- 298–316 · a personal best sparkles ------------------------------------------------------
  popIn(tl, "Star", 298, { rise: 16, spin: -60, over: 1.35 });
  tl.keys("Burst-m", "opacity", [[300, 0, E.hold], [303, 0.9, E.out], [324, 0, E.in]]);
  tl.keys("Burst-m", "scaleX", [[300, 0.3, E.hold], [324, 1.5, E.out]]);
  tl.keys("Burst-m", "scaleY", [[300, 0.3, E.hold], [324, 1.5, E.out]]);
  tl.keys("Star-m", "rotation", [[340, 8, E.loop], [364, -4, E.loop], [384, 0, E.loop]]);

  // --- 312–380 · the bot is proud ----------------------------------------------------------------
  hop(tl, 314, { height: 32, handle: 1 });
  tl.pose(302, gaze(0.4, -1), E.hold);
  tl.pose(318, gaze(0, -0.3), E.move);
  tl.keys("EyeLSolo", "y", [[316, 0, E.hold], [322, -3, E.out], [374, -3, E.hold], [380, 0, E.out]]);
  tl.keys("EyeRSolo", "y", [[316, 0, E.hold], [322, -3, E.out], [374, -3, E.hold], [380, 0, E.out]]);
  tl.keys("Char", "y", [[374, 0, E.hold], [382, -5, E.out], [394, -5, E.hold], [410, 0, E.move]]);
  tl.keys("Char", "scaleY", [[374, 1, E.hold], [382, 1.035, E.out], [394, 1.035, E.hold], [410, 1, E.move]]);
  tl.keys("Char", "scaleX", [[374, 1, E.hold], [382, 0.98, E.out], [394, 0.98, E.hold], [410, 1, E.move]]);

  // --- 378–420 · back to the start, as a cycle ------------------------------------------------------
  // The line runs on through its peak and is gone.
  tl.keys("line", "trimStart", [[378, 0, E.hold], [396, 1, E.in], [397, 0, E.hold]]);
  tl.keys("line", "trimEnd", [[396, 1, E.hold], [397, 0, E.hold]]);
  // The star floats off.
  driftAway(tl, "Star", 386, { dy: -40, to: 0.4, spin: 40, length: 20 });
  // Muscles dim, the body turns away again.
  ["legs", "core", "shoulders"].forEach((r, i) => tl.keys(`Body-map-glow-${r}`, "opacity", [[380 + i * 3, 1, E.hold], [394 + i * 3, 0, E.in]]));
  tl.keys("Body-m", "opacity", [[392, 1, E.hold], [410, 0.12, E.in]]);
  tl.keys("Body-m", "scaleX", [[392, 1, E.hold], [410, 0.46, E.in]]);
  // The flame settles back to an ember.
  tl.keys("F-m", "scaleX", [[384, 1.24, E.hold], [410, 0.55, E.move]]);
  tl.keys("F-m", "scaleY", [[384, 1.24, E.hold], [410, 0.55, E.move]]);
  tl.keys("F-flame-core", "scaleX", [[384, 1, E.hold], [406, 0.34, E.move]]);
  tl.keys("F-flame-core", "scaleY", [[384, 1, E.hold], [406, 0.34, E.move]]);
  // Each bar rises away and a fresh stub grows in its place.
  BARS.forEach((b, i) => {
    const r = 380 + i * 5;
    const m = `${b.id}-m`;
    tl.keys(m, "opacity", [[r, 1, E.hold], [r + 13, 0, E.in], [r + 14, 0, E.hold], [r + 28, 1, E.out]]);
    tl.keys(m, "y", [[r, 0, E.hold], [r + 13, -30, E.exit], [r + 14, 14, E.hold], [r + 28, 0, E.out]]);
    height(tl, b, [[r + 13, b.h, E.hold], [r + 14, STUB, E.hold]]);
    tl.colors(`${b.id}-pill`, [[r + 13, b.color, E.hold], [r + 14, PAL.well, E.hold]]);
  });
  // And the bot winds down.
  tl.keys("EyeLSolo", "scaleY", [[396, 1, E.hold], [412, SLEEPY, E.move]]);
  tl.keys("EyeRSolo", "scaleY", [[397, 1, E.hold], [413, SLEEPY, E.move]]);
  tl.pose(384, gaze(0, -0.3), E.hold);
  tl.pose(410, REST_GAZE, E.move);

  facing(tl, [
    { frame: 0, facing: REST_FACING },
    { frame: 36, facing: REST_FACING, ease: "linear" },
    { frame: 60, facing: 22, ease: "out", dyn: { lean: 1 } },
    { frame: 150, facing: 16, ease: "inOut", dyn: { lean: 1.4, lift: -2 } },
    { frame: 166, facing: 26, ease: "out", dyn: { lean: 1.8 } },
    { frame: 196, facing: 24, ease: "linear", dyn: { lean: 1.8 } },
    { frame: 214, facing: -22, ease: "inOut", dyn: { lean: -1.6 } },
    { frame: 266, facing: -22, ease: "linear", dyn: { lean: -1.6 } },
    { frame: 284, facing: 14, ease: "inOut", dyn: { lean: 1 } },
    { frame: 306, facing: 0, ease: "inOut", dyn: { lift: -3 } },
    { frame: 392, facing: 0, ease: "linear" },
    { frame: D, facing: REST_FACING, ease: "inOut" },
  ]);

  const parts = merge(stage, bars, line, star, body, fire, mascot(M));
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
