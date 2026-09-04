// Kettlebell Bot — persistent mood loops (state-machine layer "Mood").
//
// Ownership: these are the ONLY animations allowed to touch Char, BodyPivot,
// HandlePivot, Face and the two eye expression/solo nodes. Yaw, eye X/width and
// the depth panels belong to the Turn layer; blinks to the Blink layer.
//
// Every mood keys the complete channel contract (see MOOD_CHANNELS) so that
// switching moods can never leave a stale transform behind.

import { ch, E, eyes, eyesSplit, loopAnim, mergeTracks, moodBlink, wave } from "./motion.mjs";

// Wave phase that places the positive peak at time `t` of the cycle.
const pk = (t) => 0.25 - t;

export const MOOD_CHANNELS = [
  ["Char", "x", 0],
  ["Char", "y", 0],
  ["Char", "rotation", 0],
  ["Char", "scaleX", 1],
  ["Char", "scaleY", 1],
  ["BodyPivot", "y", 0],
  ["BodyPivot", "rotation", 0],
  ["BodyPivot", "scaleX", 1],
  ["BodyPivot", "scaleY", 1],
  ["HandlePivot", "x", 0],
  ["HandlePivot", "y", 0],
  ["HandlePivot", "rotation", 0],
  ["HandlePivot", "scaleX", 1],
  ["HandlePivot", "scaleY", 1],
  ["Face", "x", 0],
  ["Face", "y", 0],
  ["Face", "rotation", 0],
  ["EyeLSolo", "x", 0],
  ["EyeLSolo", "y", 0],
  ["EyeLSolo", "rotation", 0],
  ["EyeLSolo", "scaleX", 1],
  ["EyeLSolo", "scaleY", 1],
  ["EyeRSolo", "x", 0],
  ["EyeRSolo", "y", 0],
  ["EyeRSolo", "rotation", 0],
  ["EyeRSolo", "scaleX", 1],
  ["EyeRSolo", "scaleY", 1],
];

/** Fill in any channel the author did not need, so nothing carries over. */
function completeMood(name, duration, tracks) {
  const merged = mergeTracks(tracks);
  const present = new Set(merged.map((t) => `${t.target}|${t.property}`));
  for (const [target, property, rest] of MOOD_CHANNELS) {
    if (present.has(`${target}|${property}`)) continue;
    merged.push(ch(target, property, [[0, rest], [duration, rest, E.hold]]));
  }
  return loopAnim(name, duration, merged);
}

// ---------------------------------------------------------------------------
// 0 · calm — the baseline "alive but at rest" presence
// ---------------------------------------------------------------------------
function calm() {
  const d = 312;
  return completeMood("mood_00_calm", d, [
    wave("Char", "y", { duration: d, amp: 3.2, phase: 0 }),
    wave("Char", "x", { duration: d, amp: 2.1, phase: pk(0.18) }),
    wave("Char", "rotation", { duration: d, amp: 0.75, phase: pk(0.34) }),
    wave("Char", "scaleY", { duration: d, base: 1, amp: 0.009, phase: pk(0.62) }),
    wave("Char", "scaleX", { duration: d, base: 1, amp: -0.009, phase: pk(0.62) }),
    // Handle lags the body and settles later — one weighted object, not two.
    wave("HandlePivot", "rotation", { duration: d, amp: 1.35, phase: pk(0.44) }),
    wave("HandlePivot", "x", { duration: d, amp: 2.4, phase: pk(0.28) }),
    wave("HandlePivot", "y", { duration: d, amp: 1.4, phase: pk(0.1) }),
    wave("BodyPivot", "scaleY", { duration: d, base: 1, amp: 0.007, phase: pk(0.7) }),
    // Independent eye life: two unhurried glances that do not follow the body.
    ch("Face", "x", [
      [0, 0], [46, -9.5, E.enter], [104, -9, E.hold], [124, 10, E.snap],
      [196, 9.5, E.hold], [232, 0, E.move], [312, 0, E.hold],
    ]),
    ch("Face", "y", [[0, 0], [46, -3.5, E.enter], [124, 2.4, E.snap], [232, 0, E.move], [312, 0, E.hold]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [46, 1.07, E.enter], [124, 0.93, E.snap], [232, 1, E.move], [312, 1, E.hold]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [46, 0.93, E.enter], [124, 1.07, E.snap], [232, 1, E.move], [312, 1, E.hold]]),
    // Blink rhythm: a single soft blink, then a double later in the cycle.
    ch("EyeLSolo", "scaleY", [
      [0, 1], [86, 1, E.hold], [90, 0.08, E.in], [92, 0.08, E.hold], [97, 1.06, E.out], [101, 1, E.out],
      [236, 1, E.hold], [240, 0.08, E.in], [245, 1, E.out], [252, 0.12, E.in], [258, 1, E.out], [312, 1, E.hold],
    ]),
    ch("EyeRSolo", "scaleY", [
      [0, 1], [87, 1, E.hold], [91, 0.08, E.in], [93, 0.08, E.hold], [98, 1.06, E.out], [102, 1, E.out],
      [237, 1, E.hold], [241, 0.08, E.in], [246, 1, E.out], [253, 0.12, E.in], [259, 1, E.out], [312, 1, E.hold],
    ]),
    eyes([[0, "pill"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 1 · curious — leans in, scans, keeps re-targeting
// ---------------------------------------------------------------------------
function curious() {
  const d = 216;
  return completeMood("mood_01_curious", d, [
    ch("Char", "y", [[0, 0], [22, -7, E.enter], [60, -4, E.loop], [96, -9, E.enter], [140, -3, E.loop], [180, -6, E.loop], [216, 0, E.move]]),
    ch("Char", "x", [[0, 0], [30, 4, E.enter], [96, -5, E.snap], [150, 3, E.move], [216, 0, E.move]]),
    ch("Char", "rotation", [[0, 0], [30, 2.6, E.enter], [96, -3.1, E.snap], [150, 1.8, E.move], [216, 0, E.move]]),
    ch("Char", "scaleY", [[0, 1], [22, 1.026, E.enter], [96, 1.032, E.enter], [150, 1.012, E.loop], [216, 1, E.move]]),
    ch("Char", "scaleX", [[0, 1], [22, 0.978, E.enter], [96, 0.972, E.enter], [150, 0.99, E.loop], [216, 1, E.move]]),
    ch("HandlePivot", "rotation", [[0, 0], [36, -3.2, E.out], [104, 3.6, E.out], [158, -1.9, E.move], [216, 0, E.move]]),
    ch("HandlePivot", "x", [[0, 0], [36, -3.6, E.out], [104, 4.2, E.out], [158, -2, E.move], [216, 0, E.move]]),
    ch("HandlePivot", "y", [[0, 0], [28, -2.4, E.out], [100, -3, E.out], [216, 0, E.move]]),
    ch("BodyPivot", "rotation", [[0, 0], [30, -1.1, E.enter], [96, 1.3, E.snap], [216, 0, E.move]]),
    // The gaze arrives before the body and then holds — the "I noticed that" beat.
    ch("Face", "x", [[0, 0], [16, 15, E.snap], [56, 14, E.hold], [78, -16, E.snap], [128, -15, E.hold], [146, 8, E.snap], [186, 7, E.hold], [216, 0, E.move]]),
    ch("Face", "y", [[0, 0], [16, -6, E.snap], [78, 4, E.snap], [146, -5, E.snap], [216, 0, E.move]]),
    ch("Face", "rotation", [[0, 0], [16, 3, E.snap], [78, -3.6, E.snap], [146, 2.2, E.snap], [216, 0, E.move]]),
    ch("EyeLSolo", "x", [[0, 0], [16, 4, E.snap], [78, -4.5, E.snap], [146, 2, E.snap], [216, 0, E.move]]),
    ch("EyeRSolo", "x", [[0, 0], [16, 4, E.snap], [78, -4.5, E.snap], [146, 2, E.snap], [216, 0, E.move]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [16, 1.1, E.snap], [78, 0.88, E.snap], [146, 1.05, E.snap], [216, 1, E.move]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [16, 0.88, E.snap], [78, 1.1, E.snap], [146, 0.95, E.snap], [216, 1, E.move]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [60, 1, E.hold], [64, 0.1, E.in], [70, 1.1, E.out], [74, 1, E.out], [190, 1, E.hold], [194, 0.1, E.in], [200, 1, E.out], [216, 1, E.hold]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [61, 1, E.hold], [65, 0.1, E.in], [71, 1.1, E.out], [75, 1, E.out], [191, 1, E.hold], [195, 0.1, E.in], [201, 1, E.out], [216, 1, E.hold]]),
    eyes([[0, "round"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 2 · thinking — drifts, stalls, then catches an idea
// ---------------------------------------------------------------------------
function thinking() {
  const d = 192;
  return completeMood("mood_02_thinking", d, [
    ch("Char", "y", [[0, 0], [40, -4, E.loop], [86, -1, E.loop], [104, -11, E.back], [126, -6, E.out], [160, -2, E.loop], [192, 0, E.move]]),
    ch("Char", "x", [[0, 0], [44, -6, E.loop], [96, -2, E.loop], [104, 5, E.snap], [150, 4, E.loop], [192, 0, E.move]]),
    ch("Char", "rotation", [[0, 0], [44, -3.4, E.loop], [98, -1.2, E.loop], [106, 3.2, E.snap], [148, 1.4, E.loop], [192, 0, E.move]]),
    ch("Char", "scaleY", [[0, 1], [44, 1.01, E.loop], [104, 1.038, E.back], [126, 0.994, E.out], [192, 1, E.move]]),
    ch("Char", "scaleX", [[0, 1], [44, 0.992, E.loop], [104, 0.968, E.back], [126, 1.008, E.out], [192, 1, E.move]]),
    ch("HandlePivot", "rotation", [[0, 0], [52, 3.8, E.out], [110, -0.5, E.loop], [118, -4.4, E.out], [156, 1.6, E.move], [192, 0, E.move]]),
    ch("HandlePivot", "x", [[0, 0], [52, 4.2, E.out], [118, -4.8, E.out], [156, 1.8, E.move], [192, 0, E.move]]),
    ch("HandlePivot", "y", [[0, 0], [50, 2, E.out], [112, -4.5, E.out], [140, 1.2, E.move], [192, 0, E.move]]),
    ch("BodyPivot", "scaleY", [[0, 1], [104, 1.016, E.back], [130, 0.994, E.out], [192, 1, E.move]]),
    // Eyes wander off-target, stall, then snap forward on the idea.
    ch("Face", "x", [[0, 0], [30, -9, E.enter], [64, -4, E.loop], [88, -11, E.loop], [104, 6, E.snap], [140, 3, E.move], [192, 0, E.move]]),
    ch("Face", "y", [[0, 0], [30, -6, E.enter], [88, -8, E.loop], [104, -1, E.snap], [140, 1, E.move], [192, 0, E.move]]),
    ch("Face", "rotation", [[0, 0], [30, -2.4, E.enter], [88, -3, E.loop], [104, 2.2, E.snap], [192, 0, E.move]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [30, 0.82, E.enter], [88, 0.7, E.loop], [104, 1.22, E.back], [130, 1, E.out], [192, 1, E.move]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [32, 0.78, E.enter], [90, 0.66, E.loop], [106, 1.22, E.back], [132, 1, E.out], [192, 1, E.move]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [30, 1.12, E.enter], [88, 1.18, E.loop], [104, 1.14, E.back], [130, 1, E.out], [192, 1, E.move]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [32, 0.9, E.enter], [90, 0.86, E.loop], [106, 1.14, E.back], [132, 1, E.out], [192, 1, E.move]]),
    ch("EyeLSolo", "y", [[0, 0], [30, -3, E.enter], [88, -4, E.loop], [104, 0, E.snap], [192, 0, E.move]]),
    ch("EyeRSolo", "y", [[0, 0], [32, -3, E.enter], [90, -4, E.loop], [106, 0, E.snap], [192, 0, E.move]]),
    eyes([[0, "pill"], [104, "round"], [150, "pill"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 3 · working — a hammering action motif: wind up, strike, absorb, reset
// ---------------------------------------------------------------------------
function working() {
  const d = 84;
  return completeMood("mood_03_working", d, [
    ch("Char", "rotation", [[0, 0], [14, -11, E.anticipate], [22, 14.5, E.in], [28, -4.4, E.out], [40, 2, E.out], [58, -0.6, E.move], [84, 0, E.move]]),
    ch("Char", "y", [[0, 0], [14, -9, E.anticipate], [22, 12, E.in], [27, 5.5, E.out], [38, -6, E.out], [58, 1, E.move], [84, 0, E.move]]),
    ch("Char", "x", [[0, 0], [14, -5, E.anticipate], [22, 6, E.in], [40, -2, E.out], [84, 0, E.move]]),
    // Impact squash lands one frame after the strike and releases fast.
    ch("Char", "scaleY", [[0, 1], [14, 1.035, E.anticipate], [23, 0.87, E.in], [30, 1.06, E.out], [42, 0.985, E.out], [84, 1, E.move]]),
    ch("Char", "scaleX", [[0, 1], [14, 0.97, E.anticipate], [23, 1.13, E.in], [30, 0.948, E.out], [42, 1.012, E.out], [84, 1, E.move]]),
    // Handle whips through the strike and keeps swinging after the body stops.
    ch("HandlePivot", "rotation", [[0, 0], [16, 9.5, E.out], [26, -13, E.in], [34, 7, E.out], [46, -3.2, E.out], [62, 1, E.move], [84, 0, E.move]]),
    ch("HandlePivot", "x", [[0, 0], [16, 5, E.out], [26, -6.5, E.in], [36, 3, E.out], [50, -1.2, E.move], [84, 0, E.move]]),
    ch("HandlePivot", "y", [[0, 0], [16, -3, E.out], [26, 5, E.in], [36, -2, E.out], [84, 0, E.move]]),
    ch("HandlePivot", "scaleY", [[0, 1], [16, 1.03, E.out], [26, 0.94, E.in], [36, 1.02, E.out], [84, 1, E.move]]),
    ch("BodyPivot", "rotation", [[0, 0], [14, 2.4, E.anticipate], [24, -3, E.in], [40, 1, E.out], [84, 0, E.move]]),
    ch("BodyPivot", "scaleY", [[0, 1], [24, 0.968, E.in], [32, 1.022, E.out], [84, 1, E.move]]),
    ch("BodyPivot", "scaleX", [[0, 1], [24, 1.03, E.in], [32, 0.982, E.out], [84, 1, E.move]]),
    // The gaze locks on the impact point through the whole swing.
    ch("Face", "x", [[0, 0], [14, -4, E.anticipate], [22, 7, E.in], [34, 2, E.out], [84, 0, E.move]]),
    ch("Face", "y", [[0, 0], [14, -3, E.anticipate], [23, 6, E.in], [34, -1, E.out], [84, 0, E.move]]),
    ch("Face", "rotation", [[0, 0], [14, -2.6, E.anticipate], [22, 3.4, E.in], [84, 0, E.move]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [14, 1.06, E.anticipate], [23, 0.5, E.in], [32, 1.08, E.out], [46, 1, E.out], [84, 1, E.move]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [14, 1.06, E.anticipate], [23, 0.5, E.in], [32, 1.08, E.out], [46, 1, E.out], [84, 1, E.move]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [23, 1.2, E.in], [34, 0.96, E.out], [84, 1, E.move]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [23, 1.2, E.in], [34, 0.96, E.out], [84, 1, E.move]]),
    eyes([[0, "tall"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 4 · bored — slumped weight, one long sigh, eyes barely open
// ---------------------------------------------------------------------------
function bored() {
  const d = 252;
  return completeMood("mood_04_bored", d, [
    ch("Char", "y", [[0, 4.5], [60, 6, E.loop], [116, -6, E.enter], [132, -6, E.hold], [176, 8, E.in], [214, 6.5, E.out], [252, 4.5, E.move]]),
    ch("Char", "x", [[0, -5], [80, -7.5, E.loop], [150, -2, E.loop], [210, -6, E.loop], [252, -5, E.move]]),
    ch("Char", "rotation", [[0, -2.6], [80, -3.6, E.loop], [124, -1, E.enter], [176, -3.9, E.in], [252, -2.6, E.move]]),
    ch("Char", "scaleY", [[0, 0.978], [116, 1.022, E.enter], [176, 0.966, E.in], [214, 0.982, E.out], [252, 0.978, E.move]]),
    ch("Char", "scaleX", [[0, 1.018], [116, 0.984, E.enter], [176, 1.028, E.in], [214, 1.014, E.out], [252, 1.018, E.move]]),
    ch("HandlePivot", "rotation", [[0, 3.4], [88, 4.6, E.loop], [130, 1.4, E.out], [188, 5.4, E.in], [252, 3.4, E.move]]),
    ch("HandlePivot", "x", [[0, 4], [88, 5.4, E.loop], [130, 1, E.out], [188, 6, E.in], [252, 4, E.move]]),
    ch("HandlePivot", "y", [[0, 2.6], [124, -1.5, E.out], [186, 4, E.in], [252, 2.6, E.move]]),
    ch("BodyPivot", "rotation", [[0, 1.2], [124, -0.4, E.out], [186, 1.8, E.in], [252, 1.2, E.move]]),
    ch("Face", "x", [[0, 6], [70, 9, E.loop], [118, 2, E.out], [168, 8, E.move], [252, 6, E.move]]),
    ch("Face", "y", [[0, 3], [116, -2, E.out], [180, 4.5, E.in], [252, 3, E.move]]),
    ch("Face", "rotation", [[0, 1.6], [80, 2.4, E.loop], [252, 1.6, E.move]]),
    // Heavy half-shut lids with one slow, reluctant full blink.
    ch("EyeLSolo", "scaleY", [[0, 1], [40, 1, E.hold], [52, 0.16, E.in], [64, 0.9, E.out], [116, 1.08, E.out], [176, 0.86, E.in], [206, 0.2, E.in], [222, 1, E.out], [252, 1, E.move]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [42, 1, E.hold], [54, 0.16, E.in], [66, 0.88, E.out], [116, 1.06, E.out], [176, 0.84, E.in], [208, 0.2, E.in], [224, 1, E.out], [252, 1, E.move]]),
    ch("EyeLSolo", "scaleX", [[0, 1.06], [116, 0.98, E.out], [176, 1.1, E.in], [252, 1.06, E.move]]),
    ch("EyeRSolo", "scaleX", [[0, 1.02], [116, 0.96, E.out], [176, 1.06, E.in], [252, 1.02, E.move]]),
    ch("EyeLSolo", "y", [[0, 2], [116, -1, E.out], [180, 3, E.in], [252, 2, E.move]]),
    ch("EyeRSolo", "y", [[0, 2.6], [118, -1, E.out], [182, 3, E.in], [252, 2.6, E.move]]),
    eyes([[0, "slit"], [116, "pill"], [150, "slit"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 5 · blocked — pushes against the thing that is stopping it, strains, gives
// up, gathers itself and tries again. The story is in the cycle, not the pose.
// ---------------------------------------------------------------------------
function blocked() {
  const d = 180;
  return completeMood("mood_05_blocked", d, [
    // Lean in and push (0-46) · strain and shudder (46-78) · give up (78-100)
    // · slump (100-136) · gather and re-set (136-180).
    ch("Char", "x", [
      [0, 0], [12, -5, E.anticipate], [46, 13, E.in], [52, 10.5, E.out], [56, 13.5, E.in],
      [62, 10.5, E.out], [66, 13.5, E.in], [72, 11, E.out], [78, 13, E.hold],
      [88, -7, E.out], [100, -3, E.out], [136, -4.5, E.loop], [158, 2, E.move], [180, 0, E.move],
    ]),
    ch("Char", "y", [
      [0, 0], [12, -4, E.anticipate], [46, 5, E.in], [78, 7, E.loop],
      [88, 12, E.out], [104, 9, E.out], [136, 10, E.loop], [162, 2, E.move], [180, 0, E.move],
    ]),
    ch("Char", "rotation", [
      [0, 0], [12, 3.4, E.anticipate], [46, -7.5, E.in], [54, -5.5, E.out], [60, -8, E.in],
      [68, -6, E.out], [78, -7.5, E.hold], [88, 5.5, E.out], [104, 2.5, E.out],
      [136, 3.2, E.loop], [160, -1, E.move], [180, 0, E.move],
    ]),
    ch("Char", "scaleY", [
      [0, 1], [12, 1.03, E.anticipate], [46, 0.94, E.in], [78, 0.928, E.loop],
      [88, 0.9, E.out], [106, 0.955, E.out], [136, 0.95, E.loop], [180, 1, E.move],
    ]),
    ch("Char", "scaleX", [
      [0, 1], [12, 0.972, E.anticipate], [46, 1.056, E.in], [78, 1.068, E.loop],
      [88, 1.095, E.out], [106, 1.04, E.out], [136, 1.045, E.loop], [180, 1, E.move],
    ]),
    // The handle keeps straining a beat after the body quits — the mass is real.
    ch("HandlePivot", "rotation", [
      [0, 0], [18, -3, E.out], [50, 8.5, E.in], [58, 6, E.out], [64, 9, E.in], [72, 6.5, E.out],
      [82, 9.5, E.hold], [96, -6.5, E.out], [112, -2, E.out], [140, -3, E.loop], [180, 0, E.move],
    ]),
    ch("HandlePivot", "x", [
      [0, 0], [18, -3.5, E.out], [50, 9, E.in], [82, 10, E.hold], [96, -6, E.out],
      [112, -2, E.out], [140, -3.4, E.loop], [180, 0, E.move],
    ]),
    ch("HandlePivot", "y", [
      [0, 0], [18, -2.5, E.out], [50, 4, E.in], [92, 7, E.out], [112, 4.5, E.out],
      [140, 5, E.loop], [180, 0, E.move],
    ]),
    ch("BodyPivot", "rotation", [[0, 0], [46, 2.6, E.in], [88, -2.2, E.out], [136, -1, E.loop], [180, 0, E.move]]),
    ch("BodyPivot", "scaleY", [[0, 1], [46, 0.978, E.in], [88, 0.964, E.out], [136, 0.982, E.loop], [180, 1, E.move]]),
    ch("Face", "x", [[0, 0], [12, -3, E.anticipate], [46, 8, E.in], [78, 8.5, E.loop], [88, -5, E.out], [136, -3, E.loop], [180, 0, E.move]]),
    ch("Face", "y", [[0, 0], [46, 4, E.in], [88, 7, E.out], [118, 5, E.out], [180, 0, E.move]]),
    ch("Face", "rotation", [[0, 0], [46, -3.4, E.in], [88, 2.4, E.out], [136, 1.2, E.loop], [180, 0, E.move]]),
    // Eyes clamp shut with effort, pop on the failure, then sulk.
    ch("EyeLSolo", "scaleY", [[0, 0.9], [46, 0.5, E.in], [78, 0.42, E.loop], [86, 0.96, E.snap], [100, 0.62, E.out], [136, 0.58, E.loop], [180, 0.9, E.move]]),
    ch("EyeRSolo", "scaleY", [[0, 0.9], [48, 0.54, E.in], [78, 0.46, E.loop], [86, 0.96, E.snap], [100, 0.66, E.out], [136, 0.6, E.loop], [180, 0.9, E.move]]),
    ch("EyeLSolo", "rotation", [[0, -4], [46, -11, E.in], [86, -6, E.snap], [136, -9, E.loop], [180, -4, E.move]]),
    ch("EyeRSolo", "rotation", [[0, 4], [46, 11, E.in], [86, 6, E.snap], [136, 9, E.loop], [180, 4, E.move]]),
    ch("EyeLSolo", "y", [[0, 0], [46, 2, E.in], [88, 4, E.out], [180, 0, E.move]]),
    ch("EyeRSolo", "y", [[0, 0], [46, 2, E.in], [88, 4, E.out], [180, 0, E.move]]),
    eyes([[0, "wedge"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 6 · sleepy — nodding off, catching itself, giving up again
// ---------------------------------------------------------------------------
function sleepy() {
  const d = 324;
  return completeMood("mood_06_sleepy", d, [
    ch("Char", "y", [[0, 5], [96, 11, E.in], [120, 12, E.hold], [132, -3, E.back], [150, 2, E.out], [250, 10, E.in], [290, 11, E.hold], [324, 5, E.move]]),
    ch("Char", "rotation", [[0, 1.6], [96, 6.2, E.in], [132, -2.4, E.back], [152, 0.6, E.out], [250, 5.6, E.in], [324, 1.6, E.move]]),
    ch("Char", "x", [[0, 2], [110, 5, E.in], [136, -1, E.back], [260, 4, E.in], [324, 2, E.move]]),
    ch("Char", "scaleY", [[0, 0.982], [110, 0.962, E.in], [134, 1.026, E.back], [156, 0.99, E.out], [260, 0.966, E.in], [324, 0.982, E.move]]),
    ch("Char", "scaleX", [[0, 1.014], [110, 1.03, E.in], [134, 0.978, E.back], [156, 1.008, E.out], [260, 1.028, E.in], [324, 1.014, E.move]]),
    ch("HandlePivot", "rotation", [[0, -2.2], [104, -7, E.out], [140, 3, E.out], [166, -1, E.move], [258, -6.4, E.out], [324, -2.2, E.move]]),
    ch("HandlePivot", "y", [[0, 3], [104, 6.5, E.out], [140, -2, E.out], [258, 6, E.out], [324, 3, E.move]]),
    ch("HandlePivot", "x", [[0, -2.5], [104, -6, E.out], [140, 2, E.out], [258, -5.5, E.out], [324, -2.5, E.move]]),
    ch("Face", "y", [[0, 3], [104, 7, E.in], [132, -2, E.back], [258, 6.5, E.in], [324, 3, E.move]]),
    ch("Face", "x", [[0, 1.5], [110, 4, E.in], [136, -1, E.back], [324, 1.5, E.move]]),
    // Lids sink shut, snap open on the jolt, then sink again.
    ch("EyeLSolo", "scaleY", [[0, 0.62], [60, 0.34, E.in], [104, 0.1, E.in], [126, 0.1, E.hold], [134, 1.15, E.back], [156, 0.8, E.out], [214, 0.5, E.in], [268, 0.12, E.in], [300, 0.1, E.hold], [324, 0.62, E.move]]),
    ch("EyeRSolo", "scaleY", [[0, 0.58], [62, 0.3, E.in], [106, 0.09, E.in], [126, 0.09, E.hold], [136, 1.12, E.back], [158, 0.76, E.out], [216, 0.46, E.in], [270, 0.1, E.in], [300, 0.09, E.hold], [324, 0.58, E.move]]),
    ch("EyeLSolo", "scaleX", [[0, 1.08], [134, 0.95, E.back], [268, 1.1, E.in], [324, 1.08, E.move]]),
    ch("EyeRSolo", "scaleX", [[0, 1.08], [136, 0.95, E.back], [270, 1.1, E.in], [324, 1.08, E.move]]),
    ch("EyeLSolo", "y", [[0, 3], [104, 6, E.in], [134, -1, E.back], [324, 3, E.move]]),
    ch("EyeRSolo", "y", [[0, 3], [106, 6, E.in], [136, -1, E.back], [324, 3, E.move]]),
    eyes([[0, "slit"], [134, "pill"], [180, "slit"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 7 · focused — reads as focus because it is the stillest loop in the set
// ---------------------------------------------------------------------------
function focused() {
  const d = 144;
  return completeMood("mood_07_focused", d, [
    ch("Char", "y", [[0, -1.5], [72, -3.2, E.loop], [144, -1.5, E.loop]]),
    ch("Char", "x", [[0, 0], [48, 0.8, E.loop], [110, -0.8, E.loop], [144, 0, E.loop]]),
    ch("Char", "rotation", [[0, 0.4], [72, -0.5, E.loop], [144, 0.4, E.loop]]),
    ch("Char", "scaleY", [[0, 1.008], [72, 1.016, E.loop], [144, 1.008, E.loop]]),
    ch("Char", "scaleX", [[0, 0.994], [72, 0.988, E.loop], [144, 0.994, E.loop]]),
    ch("HandlePivot", "rotation", [[0, -0.8], [84, 0.9, E.loop], [144, -0.8, E.loop]]),
    ch("HandlePivot", "y", [[0, -1.4], [80, -2.6, E.loop], [144, -1.4, E.loop]]),
    ch("Face", "y", [[0, -1], [72, -2, E.loop], [144, -1, E.loop]]),
    ch("Face", "x", [[0, 0], [60, 1.2, E.loop], [120, -1.2, E.loop], [144, 0, E.loop]]),
    // One deliberate, sharp blink per cycle — no drifting, no wandering.
    ch("EyeLSolo", "scaleY", [[0, 0.9], [96, 0.9, E.hold], [99, 0.08, E.in], [101, 0.08, E.hold], [105, 1.0, E.snap], [110, 0.9, E.out], [144, 0.9, E.loop]]),
    ch("EyeRSolo", "scaleY", [[0, 0.9], [96, 0.9, E.hold], [99, 0.08, E.in], [101, 0.08, E.hold], [105, 1.0, E.snap], [110, 0.9, E.out], [144, 0.9, E.loop]]),
    ch("EyeLSolo", "scaleX", [[0, 1.05], [144, 1.05, E.hold]]),
    ch("EyeRSolo", "scaleX", [[0, 1.05], [144, 1.05, E.hold]]),
    ch("EyeLSolo", "rotation", [[0, -3], [144, -3, E.hold]]),
    ch("EyeRSolo", "rotation", [[0, 3], [144, 3, E.hold]]),
    eyes([[0, "wedge"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 8 · excited — fast, springy, can barely hold still
// ---------------------------------------------------------------------------
function excited() {
  const d = 72;
  // Three hops of unequal height: a repeated beat that never reads mechanical.
  return completeMood("mood_08_excited", d, [
    ch("Char", "y", [
      [0, 0], [4, 3, E.anticipate], [12, -15, E.out], [20, 2.5, E.in],
      [28, 3, E.anticipate], [36, -11, E.out], [44, 2.5, E.in],
      [52, 3, E.anticipate], [60, -13, E.out], [68, 2.5, E.in], [72, 0, E.out],
    ]),
    ch("Char", "x", [[0, 0], [12, 5, E.out], [24, 0, E.in], [36, -5, E.out], [48, 0, E.in], [60, 4, E.out], [72, 0, E.in]]),
    ch("Char", "rotation", [[0, 0], [12, 4.4, E.out], [24, -1, E.in], [36, -4.4, E.out], [48, 1, E.in], [60, 3.6, E.out], [72, 0, E.in]]),
    ch("Char", "scaleY", [[0, 1], [4, 0.9, E.anticipate], [12, 1.1, E.out], [20, 0.94, E.in], [26, 1.02, E.out], [28, 0.92, E.in], [36, 1.08, E.out], [44, 0.95, E.in], [52, 1.09, E.out], [64, 0.96, E.in], [72, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [4, 1.11, E.anticipate], [12, 0.91, E.out], [20, 1.06, E.in], [26, 0.98, E.out], [28, 1.09, E.in], [36, 0.93, E.out], [44, 1.05, E.in], [52, 0.92, E.out], [64, 1.04, E.in], [72, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [16, -7, E.out], [28, 4, E.in], [40, 7.5, E.out], [52, -4, E.in], [64, -3, E.out], [72, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [16, 5, E.out], [28, -3, E.in], [40, 5, E.out], [56, -2, E.in], [72, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [16, -5, E.out], [40, 5, E.out], [64, -3, E.in], [72, 0, E.out]]),
    ch("BodyPivot", "scaleY", [[0, 1], [14, 1.026, E.out], [22, 0.978, E.in], [38, 1.024, E.out], [46, 0.98, E.in], [72, 1, E.out]]),
    ch("Face", "y", [[0, 0], [12, -4.5, E.out], [22, 3, E.in], [36, -4, E.out], [46, 2.5, E.in], [60, -3.5, E.out], [72, 0, E.in]]),
    ch("Face", "x", [[0, 0], [12, 3, E.out], [36, -3, E.out], [60, 2.5, E.out], [72, 0, E.in]]),
    ch("EyeLSolo", "scaleY", [[0, 1.06], [12, 1.16, E.out], [22, 0.96, E.in], [36, 1.14, E.out], [46, 0.96, E.in], [60, 1.14, E.out], [72, 1.06, E.in]]),
    ch("EyeRSolo", "scaleY", [[0, 1.06], [13, 1.16, E.out], [23, 0.96, E.in], [37, 1.14, E.out], [47, 0.96, E.in], [61, 1.14, E.out], [72, 1.06, E.in]]),
    ch("EyeLSolo", "scaleX", [[0, 1.04], [12, 0.94, E.out], [22, 1.1, E.in], [36, 0.95, E.out], [72, 1.04, E.in]]),
    ch("EyeRSolo", "scaleX", [[0, 1.04], [13, 0.94, E.out], [23, 1.1, E.in], [37, 0.95, E.out], [72, 1.04, E.in]]),
    eyes([[0, "tall"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 9 · happy — buoyant rocking with soft arc eyes
// ---------------------------------------------------------------------------
function happy() {
  const d = 120;
  return completeMood("mood_09_happy", d, [
    wave("Char", "y", { duration: d, base: -3, amp: 5.5, phase: 0, cycles: 2 }),
    wave("Char", "x", { duration: d, amp: 5, phase: pk(0.25) }),
    wave("Char", "rotation", { duration: d, amp: 3.4, phase: pk(0.28) }),
    wave("Char", "scaleY", { duration: d, base: 1.008, amp: 0.026, phase: pk(0.62), cycles: 2 }),
    wave("Char", "scaleX", { duration: d, base: 0.994, amp: -0.026, phase: pk(0.62), cycles: 2 }),
    wave("HandlePivot", "rotation", { duration: d, amp: 4.6, phase: pk(0.38) }),
    wave("HandlePivot", "x", { duration: d, amp: 4.4, phase: pk(0.35) }),
    wave("HandlePivot", "y", { duration: d, amp: 2.6, phase: pk(0.1), cycles: 2 }),
    wave("BodyPivot", "rotation", { duration: d, amp: -1.4, phase: pk(0.22) }),
    wave("Face", "x", { duration: d, amp: 3.4, phase: pk(0.2) }),
    wave("Face", "y", { duration: d, base: -1, amp: 2.4, phase: pk(0.05), cycles: 2 }),
    wave("EyeLSolo", "scaleY", { duration: d, base: 1.02, amp: 0.1, phase: pk(0.15), cycles: 2 }),
    wave("EyeRSolo", "scaleY", { duration: d, base: 1.02, amp: 0.1, phase: pk(0.2), cycles: 2 }),
    ch("EyeLSolo", "y", [[0, -2], [120, -2, E.hold]]),
    ch("EyeRSolo", "y", [[0, -2], [120, -2, E.hold]]),
    eyes([[0, "arc"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 10 · proud — chest out, held high, unhurried
// ---------------------------------------------------------------------------
function proud() {
  const d = 180;
  return completeMood("mood_10_proud", d, [
    ch("Char", "y", [[0, -6], [90, -8.5, E.loop], [180, -6, E.loop]]),
    wave("Char", "x", { duration: d, amp: 3.6, phase: pk(0.3) }),
    wave("Char", "rotation", { duration: d, amp: 2.2, phase: pk(0.34) }),
    ch("Char", "scaleY", [[0, 1.03], [90, 1.042, E.loop], [180, 1.03, E.loop]]),
    ch("Char", "scaleX", [[0, 0.984], [90, 0.974, E.loop], [180, 0.984, E.loop]]),
    ch("BodyPivot", "scaleY", [[0, 1.012], [90, 1.02, E.loop], [180, 1.012, E.loop]]),
    ch("BodyPivot", "y", [[0, 2], [90, 3, E.loop], [180, 2, E.loop]]),
    ch("HandlePivot", "y", [[0, -5], [90, -7, E.loop], [180, -5, E.loop]]),
    wave("HandlePivot", "rotation", { duration: d, amp: 2.6, phase: pk(0.44) }),
    wave("HandlePivot", "x", { duration: d, amp: 3.2, phase: pk(0.42) }),
    ch("Face", "y", [[0, -3], [90, -4.5, E.loop], [180, -3, E.loop]]),
    wave("Face", "x", { duration: d, amp: 2.2, phase: pk(0.26) }),
    ch("EyeLSolo", "y", [[0, -3], [180, -3, E.hold]]),
    ch("EyeRSolo", "y", [[0, -3], [180, -3, E.hold]]),
    ch("EyeLSolo", "scaleY", [[0, 1.05], [90, 1.12, E.loop], [140, 1.05, E.loop], [180, 1.05, E.hold]]),
    ch("EyeRSolo", "scaleY", [[0, 1.05], [94, 1.12, E.loop], [144, 1.05, E.loop], [180, 1.05, E.hold]]),
    ch("EyeLSolo", "scaleX", [[0, 1.08], [180, 1.08, E.hold]]),
    ch("EyeRSolo", "scaleX", [[0, 1.08], [180, 1.08, E.hold]]),
    eyes([[0, "arc"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 11 · confused — hesitant stop/start, mismatched eyes, head tilts
// ---------------------------------------------------------------------------
function confused() {
  const d = 168;
  return completeMood("mood_11_confused", d, [
    ch("Char", "rotation", [[0, 0], [24, -6.5, E.back], [56, -6, E.hold], [78, 7, E.back], [116, 6.4, E.hold], [140, -2, E.move], [168, 0, E.move]]),
    ch("Char", "x", [[0, 0], [24, -4, E.back], [78, 5, E.back], [140, -1.5, E.move], [168, 0, E.move]]),
    ch("Char", "y", [[0, 0], [24, -3, E.back], [56, -1, E.loop], [78, -4, E.back], [116, -1, E.loop], [168, 0, E.move]]),
    ch("Char", "scaleY", [[0, 1], [24, 1.018, E.back], [78, 1.02, E.back], [168, 1, E.move]]),
    ch("Char", "scaleX", [[0, 1], [24, 0.986, E.back], [78, 0.984, E.back], [168, 1, E.move]]),
    ch("HandlePivot", "rotation", [[0, 0], [32, 5.5, E.out], [60, 3.4, E.loop], [88, -6, E.out], [122, -3.4, E.loop], [168, 0, E.move]]),
    ch("HandlePivot", "x", [[0, 0], [32, 4.6, E.out], [88, -5, E.out], [168, 0, E.move]]),
    ch("HandlePivot", "y", [[0, 0], [30, -2.4, E.out], [86, -2.8, E.out], [168, 0, E.move]]),
    ch("Face", "x", [[0, 0], [20, -6, E.snap], [56, -5, E.hold], [74, 7, E.snap], [116, 6, E.hold], [138, -2, E.move], [168, 0, E.move]]),
    ch("Face", "y", [[0, 0], [20, 2, E.snap], [74, -2.5, E.snap], [168, 0, E.move]]),
    ch("Face", "rotation", [[0, 0], [20, -3, E.snap], [74, 3.4, E.snap], [168, 0, E.move]]),
    // Mismatched eyes are the whole joke: one wide, one squinting, and they swap.
    ch("EyeLSolo", "scaleY", [[0, 1.1], [78, 1.1, E.hold], [86, 0.62, E.snap], [140, 0.62, E.hold], [168, 1.1, E.move]]),
    ch("EyeRSolo", "scaleY", [[0, 0.62], [78, 0.62, E.hold], [86, 1.1, E.snap], [140, 1.1, E.hold], [168, 0.62, E.move]]),
    ch("EyeLSolo", "y", [[0, -2], [86, 1.5, E.snap], [168, -2, E.move]]),
    ch("EyeRSolo", "y", [[0, 1.5], [86, -2, E.snap], [168, 1.5, E.move]]),
    ch("EyeLSolo", "rotation", [[0, -4], [86, 5, E.snap], [168, -4, E.move]]),
    ch("EyeRSolo", "rotation", [[0, 5], [86, -4, E.snap], [168, 5, E.move]]),
    eyesSplit(
      [[0, "round"], [86, "slit"], [140, "round"]],
      [[0, "slit"], [86, "round"], [140, "slit"]],
    ),
  ]);
}

// ---------------------------------------------------------------------------
// 12 · skeptical — weight pulled back, one lid low, slow sideways appraisal
// ---------------------------------------------------------------------------
function skeptical() {
  const d = 156;
  return completeMood("mood_12_skeptical", d, [
    ch("Char", "x", [[0, 4], [60, 6.5, E.loop], [120, 2.5, E.loop], [156, 4, E.loop]]),
    ch("Char", "y", [[0, 1.5], [78, 3, E.loop], [156, 1.5, E.loop]]),
    ch("Char", "rotation", [[0, 3.2], [60, 4.4, E.loop], [120, 2.2, E.loop], [156, 3.2, E.loop]]),
    ch("Char", "scaleY", [[0, 0.99], [78, 0.982, E.loop], [156, 0.99, E.loop]]),
    ch("Char", "scaleX", [[0, 1.012], [78, 1.02, E.loop], [156, 1.012, E.loop]]),
    ch("HandlePivot", "rotation", [[0, -4], [70, -5.6, E.loop], [130, -2.6, E.loop], [156, -4, E.loop]]),
    ch("HandlePivot", "x", [[0, -3.4], [70, -5, E.loop], [156, -3.4, E.loop]]),
    ch("HandlePivot", "y", [[0, 1.6], [80, 2.8, E.loop], [156, 1.6, E.loop]]),
    ch("Face", "x", [[0, -5], [54, -8, E.move], [96, -8, E.hold], [126, -3, E.move], [156, -5, E.move]]),
    ch("Face", "y", [[0, 1], [78, 2, E.loop], [156, 1, E.loop]]),
    ch("Face", "rotation", [[0, -1.8], [78, -2.6, E.loop], [156, -1.8, E.loop]]),
    ch("EyeLSolo", "scaleY", [[0, 0.5], [54, 0.42, E.move], [110, 0.5, E.move], [156, 0.5, E.hold]]),
    ch("EyeRSolo", "scaleY", [[0, 1.08], [54, 1.16, E.move], [110, 1.08, E.move], [156, 1.08, E.hold]]),
    ch("EyeLSolo", "y", [[0, 3], [156, 3, E.hold]]),
    ch("EyeRSolo", "y", [[0, -3.5], [54, -5, E.move], [110, -3.5, E.move], [156, -3.5, E.hold]]),
    ch("EyeLSolo", "scaleX", [[0, 1.1], [156, 1.1, E.hold]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [156, 1, E.hold]]),
    ch("EyeRSolo", "rotation", [[0, 6], [54, 9, E.move], [110, 6, E.move], [156, 6, E.hold]]),
    eyesSplit([[0, "slit"]], [[0, "pill"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 13 · nervous — small, fast, contained; a repeating tremor, never random noise
// ---------------------------------------------------------------------------
function nervous() {
  const d = 108;
  const tremor = (target, property, amp, phaseFrames = 0) =>
    ch(
      target,
      property,
      Array.from({ length: 13 }, (_, i) => {
        const frame = Math.round((i * d) / 12) ;
        const value = amp * Math.sin((2 * Math.PI * (i + phaseFrames)) / 4);
        return [frame, Number(value.toFixed(3)), E.loop];
      }),
    );
  return completeMood("mood_13_nervous", d, [
    tremor("Char", "x", 2.4),
    tremor("Char", "rotation", 1.5, 1),
    ch("Char", "y", [[0, 2], [26, 0.5, E.loop], [54, 2.6, E.loop], [82, 0.8, E.loop], [108, 2, E.loop]]),
    ch("Char", "scaleY", [[0, 0.99], [26, 1.006, E.loop], [54, 0.986, E.loop], [82, 1.004, E.loop], [108, 0.99, E.loop]]),
    ch("Char", "scaleX", [[0, 1.008], [26, 0.994, E.loop], [54, 1.012, E.loop], [82, 0.996, E.loop], [108, 1.008, E.loop]]),
    tremor("HandlePivot", "rotation", 2.6, 3),
    tremor("HandlePivot", "x", 2.8, 3),
    ch("HandlePivot", "y", [[0, 1.5], [54, 2.6, E.loop], [108, 1.5, E.loop]]),
    ch("Face", "x", [[0, 0], [14, 5, E.snap], [34, 5, E.hold], [46, -6, E.snap], [66, -6, E.hold], [78, 3, E.snap], [96, 3, E.hold], [108, 0, E.snap]]),
    ch("Face", "y", [[0, 1.5], [14, 0, E.snap], [46, 2.5, E.snap], [78, 0.5, E.snap], [108, 1.5, E.snap]]),
    ch("EyeLSolo", "scaleY", [[0, 0.92], [14, 1.04, E.snap], [22, 0.92, E.out], [46, 1.02, E.snap], [58, 0.9, E.out], [78, 1.05, E.snap], [90, 0.92, E.out], [108, 0.92, E.hold]]),
    ch("EyeRSolo", "scaleY", [[0, 0.92], [15, 1.04, E.snap], [23, 0.92, E.out], [47, 1.02, E.snap], [59, 0.9, E.out], [79, 1.05, E.snap], [91, 0.92, E.out], [108, 0.92, E.hold]]),
    ch("EyeLSolo", "scaleX", [[0, 0.94], [108, 0.94, E.hold]]),
    ch("EyeRSolo", "scaleX", [[0, 0.94], [108, 0.94, E.hold]]),
    eyes([[0, "pill"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 14 · playful — a skipping, teasing rhythm with a hitch in it
// ---------------------------------------------------------------------------
function playful() {
  const d = 96;
  return completeMood("mood_14_playful", d, [
    ch("Char", "x", [[0, 0], [10, -6, E.anticipate], [24, 9, E.out], [38, 8, E.loop], [48, 0, E.move], [58, 6, E.anticipate], [72, -9, E.out], [86, -7, E.loop], [96, 0, E.move]]),
    ch("Char", "y", [[0, 0], [8, 4, E.anticipate], [20, -13, E.out], [32, 2, E.in], [40, 0, E.out], [56, 3, E.anticipate], [68, -11, E.out], [80, 2, E.in], [96, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [20, 7.5, E.out], [40, 2, E.in], [68, -7.5, E.out], [88, -2, E.in], [96, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [8, 0.9, E.anticipate], [20, 1.11, E.out], [32, 0.95, E.in], [40, 1.01, E.out], [56, 0.92, E.anticipate], [68, 1.1, E.out], [80, 0.96, E.in], [96, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [8, 1.11, E.anticipate], [20, 0.9, E.out], [32, 1.06, E.in], [40, 0.99, E.out], [56, 1.09, E.anticipate], [68, 0.91, E.out], [80, 1.05, E.in], [96, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [26, -9, E.out], [42, 4, E.in], [74, 9, E.out], [90, -4, E.in], [96, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [26, -7, E.out], [74, 7, E.out], [96, 0, E.in]]),
    ch("HandlePivot", "y", [[0, 0], [24, 5, E.out], [40, -2, E.in], [72, 5, E.out], [96, 0, E.in]]),
    ch("BodyPivot", "rotation", [[0, 0], [22, -2.6, E.out], [70, 2.6, E.out], [96, 0, E.in]]),
    ch("Face", "x", [[0, 0], [20, 5, E.out], [44, 2, E.in], [68, -5, E.out], [96, 0, E.in]]),
    ch("Face", "y", [[0, 0], [20, -4, E.out], [32, 2, E.in], [68, -4, E.out], [80, 2, E.in], [96, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [20, 1.18, E.out], [32, 0.9, E.in], [44, 1.02, E.out], [68, 1.18, E.out], [80, 0.9, E.in], [96, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [21, 1.18, E.out], [33, 0.9, E.in], [45, 1.02, E.out], [48, 0.16, E.in], [56, 1.1, E.out], [69, 1.18, E.out], [81, 0.9, E.in], [96, 1, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1.02], [20, 0.94, E.out], [96, 1.02, E.in]]),
    ch("EyeRSolo", "scaleX", [[0, 1.02], [21, 0.94, E.out], [96, 1.02, E.in]]),
    ch("EyeLSolo", "y", [[0, -1], [96, -1, E.hold]]),
    ch("EyeRSolo", "y", [[0, -1], [96, -1, E.hold]]),
    eyes([[0, "arc"]]),
  ]);
}

// ---------------------------------------------------------------------------
// 15 · listening — leaning in, tracking, small acknowledging nods
// ---------------------------------------------------------------------------
function listening() {
  const d = 180;
  return completeMood("mood_15_listening", d, [
    ch("Char", "y", [[0, -3], [40, -5, E.loop], [72, -2, E.out], [80, -6, E.out], [92, -3.5, E.out], [130, -5, E.loop], [160, -2.5, E.out], [168, -5.5, E.out], [180, -3, E.out]]),
    ch("Char", "x", [[0, 0], [60, 3, E.loop], [120, -3, E.loop], [180, 0, E.loop]]),
    ch("Char", "rotation", [[0, 1.2], [60, 2.6, E.loop], [120, -1.4, E.loop], [180, 1.2, E.loop]]),
    ch("Char", "scaleY", [[0, 1.014], [76, 1.026, E.out], [92, 1.012, E.out], [180, 1.014, E.loop]]),
    ch("Char", "scaleX", [[0, 0.99], [76, 0.978, E.out], [92, 0.992, E.out], [180, 0.99, E.loop]]),
    ch("HandlePivot", "rotation", [[0, -1], [68, -3, E.loop], [86, 1.4, E.out], [128, 1.6, E.loop], [180, -1, E.loop]]),
    ch("HandlePivot", "y", [[0, -2], [80, 1.5, E.out], [96, -2.6, E.out], [180, -2, E.loop]]),
    ch("HandlePivot", "x", [[0, 0], [68, -3, E.loop], [128, 3, E.loop], [180, 0, E.loop]]),
    ch("Face", "x", [[0, 0], [34, 10, E.move], [70, 9.5, E.hold], [100, -9, E.move], [146, -8.5, E.hold], [180, 0, E.move]]),
    ch("Face", "y", [[0, -1.5], [80, 2, E.out], [94, -2, E.out], [168, 1.5, E.out], [180, -1.5, E.out]]),
    ch("Face", "rotation", [[0, 0], [34, 1.8, E.move], [100, -1.6, E.move], [180, 0, E.move]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [40, 1, E.hold], [44, 0.1, E.in], [50, 1.08, E.out], [54, 1, E.out], [136, 1, E.hold], [140, 0.1, E.in], [146, 1, E.out], [180, 1, E.hold]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [41, 1, E.hold], [45, 0.1, E.in], [51, 1.08, E.out], [55, 1, E.out], [137, 1, E.hold], [141, 0.1, E.in], [147, 1, E.out], [180, 1, E.hold]]),
    ch("EyeLSolo", "scaleX", [[0, 1.02], [34, 1.08, E.move], [100, 0.96, E.move], [180, 1.02, E.move]]),
    ch("EyeRSolo", "scaleX", [[0, 1.02], [34, 0.96, E.move], [100, 1.08, E.move], [180, 1.02, E.move]]),
    ch("EyeLSolo", "y", [[0, -1.5], [180, -1.5, E.hold]]),
    ch("EyeRSolo", "y", [[0, -1.5], [180, -1.5, E.hold]]),
    eyes([[0, "round"]]),
  ]);
}

export const MOODS = [
  { status: 0, key: "calm", build: calm },
  { status: 1, key: "curious", build: curious },
  { status: 2, key: "thinking", build: thinking },
  { status: 3, key: "working", build: working },
  { status: 4, key: "bored", build: bored },
  { status: 5, key: "blocked", build: blocked },
  { status: 6, key: "sleepy", build: sleepy },
  { status: 7, key: "focused", build: focused },
  { status: 8, key: "excited", build: excited },
  { status: 9, key: "happy", build: happy },
  { status: 10, key: "proud", build: proud },
  { status: 11, key: "confused", build: confused },
  { status: 12, key: "skeptical", build: skeptical },
  { status: 13, key: "nervous", build: nervous },
  { status: 14, key: "playful", build: playful },
  { status: 15, key: "listening", build: listening },
];

export function buildMoods() {
  return MOODS.map((m) => {
    const anim = m.build();
    return { ...m, animation: anim.name, anim };
  });
}
