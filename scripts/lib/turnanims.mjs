// Kettlebell Bot — Turn layer content (facing poses, scripted head turns, spins)
// plus the gaze, energy and touch layers.
//
// Everything here is generated from the projection model in turn.mjs, so a held
// facing pose, a curious head-turn and a full 360 spin are all the same geometry
// sampled differently — they can never disagree with each other.

import { ch, E, FPS, loopAnim, oneShot, pose } from "./motion.mjs";
import { sampleFacing, turnPoseTracks, turnTracks } from "./turn.mjs";

// Fine enough that blending two neighbours never averages away what a pose is
// doing. At 30 degrees a facing of 75 was an even mix of the 60 and 90 poses,
// and anything that fades between them rendered half-transparent -- a ghost.
export const FACING_STEP = 10;

/** 37 static poses at 10 degree steps, wired into the `facing` blend state. */
export function buildFacingPoses() {
  const poses = [];
  for (let deg = 0; deg <= 360; deg += FACING_STEP) {
    const name = `face_${String(deg).padStart(3, "0")}`;
    poses.push({ deg, name, anim: pose(name, turnPoseTracks(deg)) });
  }
  return poses;
}

const yaw = (name, duration, keys, step = 4) =>
  loopAnim(name, duration, turnTracks(sampleFacing(keys, step)));

const yawShot = (name, duration, keys, step = 3) =>
  oneShot(name, duration, turnTracks(sampleFacing(keys, step)));

/** Scripted head turns for the moods whose whole point is where they look. */
export function buildYawLoops() {
  return [
    {
      status: 1,
      state: "YawCurious",
      anim: yaw("yaw_curious", 216, [
        { frame: 0, facing: 0 },
        { frame: 26, facing: -30, ease: "out", dyn: { lean: 2.2, lift: -3 } },
        { frame: 64, facing: -30, ease: "linear", dyn: { lean: 2.2, lift: -3 } },
        { frame: 88, facing: 34, ease: "outBack", dyn: { lean: -2.4, lift: -4 } },
        { frame: 130, facing: 34, ease: "linear", dyn: { lean: -2.4, lift: -4 } },
        { frame: 158, facing: 10, ease: "inOut", dyn: { lean: -0.8 } },
        { frame: 186, facing: -8, ease: "inOut", dyn: { lean: 0.6 } },
        { frame: 216, facing: 0, ease: "inOut" },
      ]),
    },
    {
      status: 2,
      state: "YawThinking",
      anim: yaw("yaw_thinking", 192, [
        { frame: 0, facing: 0 },
        { frame: 44, facing: -26, ease: "inOut", dyn: { lean: 2, lift: -2 } },
        { frame: 88, facing: -22, ease: "inOut", dyn: { lean: 1.8, lift: -3 } },
        { frame: 106, facing: 12, ease: "outBack", dyn: { lean: -1.6, lift: -6 } },
        { frame: 146, facing: 16, ease: "inOut", dyn: { lean: -1.2 } },
        { frame: 192, facing: 0, ease: "inOut" },
      ]),
    },
    {
      status: 3,
      state: "YawWorking",
      anim: yaw("yaw_working", 84, [
        { frame: 0, facing: 0 },
        { frame: 14, facing: -15, ease: "out", dyn: { lean: 1.4 } },
        { frame: 23, facing: 17, ease: "in", dyn: { lean: -1.8 } },
        { frame: 40, facing: 5, ease: "out" },
        { frame: 62, facing: -8, ease: "inOut", dyn: { lean: 0.8 } },
        { frame: 84, facing: 0, ease: "inOut" },
      ], 3),
    },
    {
      status: 4,
      state: "YawBored",
      anim: yaw("yaw_bored", 252, [
        { frame: 0, facing: 26, dyn: { lean: -1.6 } },
        { frame: 70, facing: 42, ease: "inOut", dyn: { lean: -2.4 } },
        { frame: 132, facing: 42, ease: "linear", dyn: { lean: -2.4 } },
        { frame: 178, facing: 12, ease: "inOut", dyn: { lean: -0.8 } },
        { frame: 216, facing: 22, ease: "inOut", dyn: { lean: -1.4 } },
        { frame: 252, facing: 26, ease: "inOut", dyn: { lean: -1.6 } },
      ], 6),
    },
    {
      status: 11,
      state: "YawConfused",
      anim: yaw("yaw_confused", 168, [
        { frame: 0, facing: 0 },
        { frame: 24, facing: -30, ease: "outBack", dyn: { lean: 3 } },
        { frame: 62, facing: -27, ease: "linear", dyn: { lean: 3 } },
        { frame: 82, facing: 34, ease: "outBack", dyn: { lean: -3.2 } },
        { frame: 120, facing: 31, ease: "linear", dyn: { lean: -3.2 } },
        { frame: 146, facing: -8, ease: "inOut", dyn: { lean: 1 } },
        { frame: 168, facing: 0, ease: "inOut" },
      ]),
    },
    {
      status: 14,
      state: "YawPlayful",
      anim: yaw("yaw_playful", 96, [
        { frame: 0, facing: 0 },
        { frame: 20, facing: 42, ease: "out", dyn: { lean: -3.4, lift: -4 } },
        { frame: 42, facing: 18, ease: "inOut" },
        { frame: 54, facing: -8, ease: "inOut" },
        { frame: 72, facing: -44, ease: "out", dyn: { lean: 3.4, lift: -4 } },
        { frame: 88, facing: -16, ease: "inOut" },
        { frame: 96, facing: 0, ease: "inOut" },
      ], 3),
    },
  ];
}

/** Triggered turns: two full spins, the 360 showcase, and a look-over-shoulder. */
export function buildTurnShots() {
  const spinRight = yawShot("turn_spin_right", 90, [
    { frame: 0, facing: 0 },
    { frame: 11, facing: -34, ease: "out", dyn: { squash: 0.05, lift: 5, lean: 3 } },
    { frame: 17, facing: -34, ease: "linear", dyn: { squash: 0.05, lift: 5, lean: 3 } },
    { frame: 30, facing: 54, ease: "in", dyn: { lift: -9, lean: -4 } },
    { frame: 46, facing: 180, ease: "linear", dyn: { lift: -12, lean: -5 } },
    { frame: 62, facing: 306, ease: "linear", dyn: { lift: -9, lean: -4 } },
    { frame: 74, facing: 376, ease: "out", dyn: { lift: 2, lean: 2, squash: 0.04 } },
    { frame: 82, facing: 352, ease: "inOut", dyn: { lift: 0, lean: -1 } },
    { frame: 90, facing: 360, ease: "inOut" },
  ]);

  const spinLeft = yawShot("turn_spin_left", 90, [
    { frame: 0, facing: 0 },
    { frame: 11, facing: 34, ease: "out", dyn: { squash: 0.05, lift: 5, lean: -3 } },
    { frame: 17, facing: 34, ease: "linear", dyn: { squash: 0.05, lift: 5, lean: -3 } },
    { frame: 30, facing: -54, ease: "in", dyn: { lift: -9, lean: 4 } },
    { frame: 46, facing: -180, ease: "linear", dyn: { lift: -12, lean: 5 } },
    { frame: 62, facing: -306, ease: "linear", dyn: { lift: -9, lean: 4 } },
    { frame: 74, facing: -376, ease: "out", dyn: { lift: 2, lean: -2, squash: 0.04 } },
    { frame: 82, facing: -352, ease: "inOut", dyn: { lift: 0, lean: 1 } },
    { frame: 90, facing: -360, ease: "inOut" },
  ]);

  // The required turnaround, held long enough at each key facing to read:
  // front -> three-quarter -> profile -> back -> opposite profile -> front.
  const turnaround = yawShot("turn_showcase_360", 420, [
    { frame: 0, facing: 0 },
    { frame: 24, facing: 0, ease: "linear" },
    { frame: 60, facing: 45, ease: "inOut", dyn: { lean: -1.6, lift: -3 } },
    { frame: 84, facing: 45, ease: "linear", dyn: { lean: -1.6, lift: -3 } },
    { frame: 120, facing: 90, ease: "inOut", dyn: { lean: -2.2, lift: -4 } },
    { frame: 144, facing: 90, ease: "linear", dyn: { lean: -2.2, lift: -4 } },
    { frame: 192, facing: 180, ease: "inOut", dyn: { lean: 0, lift: -2 } },
    { frame: 220, facing: 180, ease: "linear", dyn: { lift: -2 } },
    { frame: 268, facing: 270, ease: "inOut", dyn: { lean: 2.2, lift: -4 } },
    { frame: 292, facing: 270, ease: "linear", dyn: { lean: 2.2, lift: -4 } },
    { frame: 328, facing: 315, ease: "inOut", dyn: { lean: 1.6, lift: -3 } },
    { frame: 352, facing: 315, ease: "linear", dyn: { lean: 1.6, lift: -3 } },
    { frame: 396, facing: 360, ease: "inOut" },
    { frame: 420, facing: 360, ease: "linear" },
  ], 4);

  const peek = yawShot("turn_peek_back", 96, [
    { frame: 0, facing: 0 },
    { frame: 10, facing: -20, ease: "out", dyn: { lean: 1.8 } },
    { frame: 36, facing: 118, ease: "in", dyn: { lean: -3, lift: -5 } },
    { frame: 48, facing: 152, ease: "out", dyn: { lean: -2, lift: -4 } },
    { frame: 64, facing: 150, ease: "linear", dyn: { lean: -2, lift: -4 } },
    { frame: 82, facing: 32, ease: "in", dyn: { lean: 1.6 } },
    { frame: 96, facing: 0, ease: "outBack" },
  ]);

  return [
    { key: "spinRight", trigger: "spinRight", state: "SpinRight", anim: spinRight },
    { key: "spinLeft", trigger: "spinLeft", state: "SpinLeft", anim: spinLeft },
    { key: "turnaround", trigger: "turnaround", state: "Turnaround", anim: turnaround },
    { key: "peek", trigger: "peek", state: "PeekBack", anim: peek },
  ];
}

// ---------------------------------------------------------------------------
// Gaze — two independent 1D blends so an app can point the eyes anywhere.
// ---------------------------------------------------------------------------
export function buildGazePoses() {
  const gx = (name, x, rotation, scaleX) =>
    pose(name, [
      ch("GazeX", "x", [[0, x]]),
      ch("GazeX", "rotation", [[0, rotation]]),
      ch("GazeX", "scaleX", [[0, scaleX]]),
    ]);
  const gy = (name, y, scaleY, rotation) =>
    pose(name, [
      ch("GazeY", "y", [[0, y]]),
      ch("GazeY", "scaleY", [[0, scaleY]]),
      ch("GazeY", "rotation", [[0, rotation]]),
    ]);
  return {
    x: [
      { value: -1, anim: gx("gaze_x_left", -21, -2.8, 0.92) },
      { value: 0, anim: gx("gaze_x_center", 0, 0, 1) },
      { value: 1, anim: gx("gaze_x_right", 21, 2.8, 0.92) },
    ],
    y: [
      { value: -1, anim: gy("gaze_y_up", -15, 1.1, 0) },
      { value: 0, anim: gy("gaze_y_center", 0, 1, 0) },
      { value: 1, anim: gy("gaze_y_down", 16, 0.84, 0) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Energy — the `intensity` dial. Same rhythm at every level, rising amplitude,
// with y / rotation / scale peaks deliberately out of phase.
// ---------------------------------------------------------------------------
export function buildEnergyPoses() {
  const d = 168;
  const level = (name, k) =>
    loopAnim(name, d, [
      ch("Energy", "y", [[0, 0], [42, -3.6 * k, E.loop], [84, 0, E.loop], [126, 2.2 * k, E.loop], [168, 0, E.loop]]),
      ch("Energy", "x", [[0, 0], [56, 1.8 * k, E.loop], [112, -1.8 * k, E.loop], [168, 0, E.loop]]),
      ch("Energy", "rotation", [[0, 0], [50, 0.9 * k, E.loop], [118, -0.9 * k, E.loop], [168, 0, E.loop]]),
      ch("Energy", "scaleY", [[0, 1], [60, 1 + 0.014 * k, E.loop], [140, 1 - 0.008 * k, E.loop], [168, 1, E.loop]]),
      ch("Energy", "scaleX", [[0, 1], [60, 1 - 0.014 * k, E.loop], [140, 1 + 0.008 * k, E.loop], [168, 1, E.loop]]),
    ]);
  return [
    { value: 0, anim: level("energy_low", 0.35) },
    { value: 0.5, anim: level("energy_mid", 1) },
    { value: 1, anim: level("energy_high", 2.1) },
  ];
}

// ---------------------------------------------------------------------------
// Touch — hover lifts the bot toward the viewer, press squashes it.
// ---------------------------------------------------------------------------
export function buildTouchAnims() {
  const rest = loopAnim("touch_rest", 30, [
    ch("Touch", "y", [[0, 0], [30, 0, E.hold]]),
    ch("Touch", "scaleX", [[0, 1], [30, 1, E.hold]]),
    ch("Touch", "scaleY", [[0, 1], [30, 1, E.hold]]),
    ch("Touch", "rotation", [[0, 0], [30, 0, E.hold]]),
  ]);
  const hover = loopAnim("touch_hover", 120, [
    ch("Touch", "y", [[0, -10], [40, -13, E.loop], [92, -8, E.loop], [120, -10, E.loop]]),
    ch("Touch", "scaleX", [[0, 1.04], [60, 1.05, E.loop], [120, 1.04, E.loop]]),
    ch("Touch", "scaleY", [[0, 1.04], [60, 1.05, E.loop], [120, 1.04, E.loop]]),
    ch("Touch", "rotation", [[0, -0.7], [56, 0.7, E.loop], [120, -0.7, E.loop]]),
  ]);
  const press = oneShot("touch_press", 12, [
    ch("Touch", "y", [[0, 0], [5, 16, E.in], [12, 13, E.out]]),
    ch("Touch", "scaleX", [[0, 1], [5, 1.15, E.in], [12, 1.12, E.out]]),
    ch("Touch", "scaleY", [[0, 1], [5, 0.85, E.in], [12, 0.88, E.out]]),
    ch("Touch", "rotation", [[0, 0], [6, -1.6, E.in], [12, -1.3, E.out]]),
  ]);
  return { rest, hover, press };
}

export { FPS };
