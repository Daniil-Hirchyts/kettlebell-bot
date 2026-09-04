// Kettlebell Bot — one-shot reactions (state-machine layer "Reaction").
//
// The Reaction layer sits above the Mood layer and only keys what it needs, so
// a reaction temporarily takes the wheel and then hands motion back to the mood
// underneath. Every reaction starts and ends on identity values, which is what
// makes the blend in and out invisible.

import { ch, E, eyes, eyesSplit, oneShot } from "./motion.mjs";

// --- acknowledge: a weighted "got it" nod --------------------------------
const acknowledge = () =>
  oneShot("react_acknowledge", 33, [
    ch("Char", "y", [[0, 0], [5, -6, E.anticipate], [13, 11, E.in], [20, -4, E.out], [26, 1.5, E.out], [33, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [5, 2.6, E.anticipate], [13, -4.4, E.in], [20, 1.6, E.out], [33, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [5, 1.035, E.anticipate], [14, 0.925, E.in], [21, 1.03, E.out], [33, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [5, 0.97, E.anticipate], [14, 1.08, E.in], [21, 0.978, E.out], [33, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [8, -2.6, E.out], [17, 4.6, E.in], [24, -2, E.out], [33, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [8, -3, E.out], [17, 5, E.in], [26, -1.4, E.out], [33, 0, E.out]]),
    ch("Face", "y", [[0, 0], [5, -3, E.anticipate], [13, 7, E.in], [21, -2, E.out], [33, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [5, 1.1, E.anticipate], [14, 0.42, E.in], [22, 1.14, E.out], [33, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [5, 1.1, E.anticipate], [14, 0.42, E.in], [22, 1.14, E.out], [33, 1, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [14, 1.14, E.in], [22, 0.96, E.out], [33, 1, E.out]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [14, 1.14, E.in], [22, 0.96, E.out], [33, 1, E.out]]),
    eyes([[0, "pill"]]),
  ]);

// --- surprise: hard recoil, eyes blow open, two settling bounces ---------
const surprise = () =>
  oneShot("react_surprise", 48, [
    ch("Char", "y", [[0, 0], [3, 4, E.in], [11, -20, E.out], [18, -14, E.loop], [26, 3, E.in], [33, -3, E.out], [40, 1, E.in], [48, 0, E.out]]),
    ch("Char", "x", [[0, 0], [3, 2, E.in], [11, -7, E.out], [26, 3, E.loop], [36, -1.5, E.out], [48, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [3, 1.5, E.in], [11, -6.5, E.out], [26, 3.4, E.loop], [36, -1.4, E.out], [48, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [3, 0.93, E.in], [11, 1.12, E.out], [20, 1.05, E.loop], [27, 0.95, E.in], [34, 1.02, E.out], [48, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [3, 1.08, E.in], [11, 0.9, E.out], [20, 0.96, E.loop], [27, 1.05, E.in], [34, 0.985, E.out], [48, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [6, 4, E.out], [16, -8, E.in], [26, 5, E.out], [36, -2, E.out], [48, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [6, 5.5, E.out], [16, -4, E.in], [30, 2, E.out], [48, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [6, 4, E.out], [18, -5, E.in], [48, 0, E.out]]),
    ch("Face", "y", [[0, 0], [3, 2, E.in], [11, -5, E.out], [26, 2, E.loop], [48, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [3, 0.7, E.in], [10, 1.42, E.back], [22, 1.3, E.loop], [34, 1.06, E.out], [48, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [3, 0.7, E.in], [10, 1.42, E.back], [22, 1.3, E.loop], [34, 1.06, E.out], [48, 1, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [3, 1.2, E.in], [10, 1.42, E.back], [22, 1.3, E.loop], [34, 1.06, E.out], [48, 1, E.out]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [3, 1.2, E.in], [10, 1.42, E.back], [22, 1.3, E.loop], [34, 1.06, E.out], [48, 1, E.out]]),
    eyes([[0, "pill"], [8, "round"], [40, "pill"]]),
  ]);

// --- celebrate: crouch, launch, flourish, land, two rebound hops ---------
const celebrate = () =>
  oneShot("react_celebrate", 90, [
    ch("Char", "y", [[0, 0], [9, 13, E.in], [14, 11, E.hold], [26, -52, E.out], [36, -46, E.loop], [48, 6, E.in], [54, 2, E.out], [62, -18, E.out], [70, 3, E.in], [78, -7, E.out], [86, 1, E.in], [90, 0, E.out]]),
    ch("Char", "x", [[0, 0], [9, -3, E.in], [26, 6, E.out], [48, -3, E.in], [62, 4, E.out], [78, -2, E.out], [90, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [9, -4, E.in], [26, 9, E.out], [40, 3, E.loop], [50, -6, E.in], [62, 4.5, E.out], [78, -2, E.out], [90, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [9, 0.86, E.in], [22, 1.16, E.out], [36, 1.06, E.loop], [50, 0.85, E.in], [58, 1.08, E.out], [70, 0.93, E.in], [90, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [9, 1.16, E.in], [22, 0.88, E.out], [36, 0.96, E.loop], [50, 1.17, E.in], [58, 0.95, E.out], [70, 1.06, E.in], [90, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [12, 6, E.out], [28, -14, E.in], [42, 8, E.out], [56, -9, E.in], [70, 5, E.out], [82, -2, E.out], [90, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [12, 7, E.out], [28, -9, E.in], [50, 6, E.out], [66, -3, E.in], [90, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [12, -4, E.out], [30, 7, E.in], [56, -5, E.out], [90, 0, E.out]]),
    ch("BodyPivot", "scaleY", [[0, 1], [10, 0.95, E.in], [24, 1.05, E.out], [52, 0.94, E.in], [62, 1.03, E.out], [90, 1, E.out]]),
    ch("Face", "y", [[0, 0], [9, 5, E.in], [26, -8, E.out], [50, 4, E.in], [62, -3, E.out], [90, 0, E.out]]),
    ch("Face", "rotation", [[0, 0], [26, 4, E.out], [50, -3, E.in], [90, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [9, 0.7, E.in], [22, 1.35, E.back], [44, 1.2, E.loop], [56, 0.9, E.in], [66, 1.12, E.out], [90, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [10, 0.7, E.in], [23, 1.35, E.back], [45, 1.2, E.loop], [57, 0.9, E.in], [67, 1.12, E.out], [90, 1, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [9, 1.15, E.in], [22, 1.3, E.back], [56, 0.95, E.in], [90, 1, E.out]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [10, 1.15, E.in], [23, 1.3, E.back], [57, 0.95, E.in], [90, 1, E.out]]),
    ch("EyeLSolo", "rotation", [[0, 0], [26, -18, E.out], [50, 10, E.in], [74, -4, E.out], [90, 0, E.out]]),
    ch("EyeRSolo", "rotation", [[0, 0], [26, 18, E.out], [50, -10, E.in], [74, 4, E.out], [90, 0, E.out]]),
    eyes([[0, "pill"], [9, "arc"], [22, "star"], [58, "arc"], [82, "pill"]]),
  ]);

// --- frustrated: three decaying shakes and a heavy exhale ----------------
const frustrated = () =>
  oneShot("react_frustrated", 60, [
    ch("Char", "x", [[0, 0], [6, -4, E.anticipate], [11, 13, E.snap], [17, -12, E.snap], [23, 9, E.snap], [29, -6, E.snap], [34, 3, E.out], [40, -1.2, E.out], [60, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [6, 2.4, E.anticipate], [11, -7, E.snap], [17, 6.4, E.snap], [23, -4.6, E.snap], [29, 3, E.snap], [40, -1, E.out], [60, 0, E.out]]),
    ch("Char", "y", [[0, 0], [6, -5, E.anticipate], [12, 2, E.in], [30, 4, E.loop], [38, 12, E.in], [48, 8, E.out], [60, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [6, 1.05, E.anticipate], [14, 0.96, E.in], [38, 0.9, E.in], [48, 0.95, E.out], [60, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [6, 0.955, E.anticipate], [14, 1.035, E.in], [38, 1.1, E.in], [48, 1.045, E.out], [60, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [9, 7, E.out], [15, -8, E.snap], [21, 6, E.snap], [27, -4, E.snap], [34, 2, E.out], [44, 3.5, E.out], [60, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [9, 6, E.out], [15, -7, E.snap], [21, 5, E.snap], [34, -2, E.out], [60, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [12, -3, E.out], [40, 6, E.in], [50, 4, E.out], [60, 0, E.out]]),
    ch("Face", "x", [[0, 0], [11, -6, E.snap], [17, 5, E.snap], [23, -4, E.snap], [34, 0, E.out], [60, 0, E.out]]),
    ch("Face", "y", [[0, 0], [8, -2, E.out], [40, 5, E.in], [60, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [8, 0.52, E.in], [30, 0.46, E.loop], [40, 0.34, E.in], [50, 0.7, E.out], [60, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [8, 0.56, E.in], [30, 0.5, E.loop], [40, 0.36, E.in], [50, 0.72, E.out], [60, 1, E.out]]),
    ch("EyeLSolo", "rotation", [[0, 0], [8, -11, E.in], [44, -8, E.loop], [60, 0, E.out]]),
    ch("EyeRSolo", "rotation", [[0, 0], [8, 11, E.in], [44, 8, E.loop], [60, 0, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [8, 1.14, E.in], [60, 1, E.out]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [8, 1.14, E.in], [60, 1, E.out]]),
    eyes([[0, "pill"], [7, "wedge"], [52, "pill"]]),
  ]);

// --- relieved: inhale, long exhale, shoulders drop ------------------------
const relieved = () =>
  oneShot("react_relieved", 66, [
    ch("Char", "y", [[0, 0], [12, -12, E.enter], [20, -12, E.hold], [42, 8, E.in], [52, 5, E.out], [66, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [12, -1.6, E.enter], [42, 2.6, E.in], [66, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [12, 1.06, E.enter], [20, 1.06, E.hold], [44, 0.93, E.in], [54, 0.985, E.out], [66, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [12, 0.955, E.enter], [20, 0.955, E.hold], [44, 1.07, E.in], [54, 1.012, E.out], [66, 1, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [16, -6, E.enter], [46, 7, E.in], [58, 2, E.out], [66, 0, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [16, 2, E.enter], [46, -3.4, E.in], [66, 0, E.out]]),
    ch("Face", "y", [[0, 0], [12, -4, E.enter], [44, 5, E.in], [66, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [10, 1.15, E.enter], [22, 1.15, E.hold], [40, 0.9, E.in], [66, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [11, 1.15, E.enter], [23, 1.15, E.hold], [41, 0.9, E.in], [66, 1, E.out]]),
    ch("EyeLSolo", "y", [[0, 0], [26, -3, E.enter], [66, 0, E.out]]),
    ch("EyeRSolo", "y", [[0, 0], [26, -3, E.enter], [66, 0, E.out]]),
    eyes([[0, "pill"], [22, "arc"], [58, "pill"]]),
  ]);

// --- wobble: knocked off balance, teeters, recovers -----------------------
const wobble = () =>
  oneShot("react_wobble", 60, [
    ch("Char", "rotation", [[0, 0], [7, 14, E.out], [17, -11.5, E.loop], [26, 8, E.loop], [34, -5.2, E.loop], [42, 3, E.loop], [50, -1.4, E.out], [60, 0, E.out]]),
    ch("Char", "x", [[0, 0], [7, 9, E.out], [17, -8, E.loop], [26, 5.5, E.loop], [34, -3.4, E.loop], [44, 1.6, E.out], [60, 0, E.out]]),
    ch("Char", "y", [[0, 0], [10, 4, E.out], [22, -2, E.loop], [36, 2, E.loop], [60, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [8, 0.96, E.out], [20, 1.03, E.loop], [34, 0.985, E.loop], [60, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [8, 1.04, E.out], [20, 0.975, E.loop], [34, 1.012, E.loop], [60, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [12, -11, E.out], [22, 9, E.loop], [32, -6, E.loop], [42, 3.4, E.loop], [60, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [12, -8, E.out], [22, 6, E.loop], [34, -3, E.loop], [60, 0, E.out]]),
    ch("BodyPivot", "rotation", [[0, 0], [10, -4, E.out], [24, 3, E.loop], [60, 0, E.out]]),
    ch("Face", "x", [[0, 0], [8, -5, E.out], [18, 4, E.loop], [30, -2.4, E.loop], [60, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [8, 1.22, E.out], [30, 1.1, E.loop], [60, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [9, 1.22, E.out], [31, 1.1, E.loop], [60, 1, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [8, 1.18, E.out], [60, 1, E.out]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [9, 1.18, E.out], [60, 1, E.out]]),
    eyes([[0, "pill"], [6, "round"], [50, "pill"]]),
  ]);

// --- gear up: coil, hold the coil, snap into a ready stance --------------
const gearUp = () =>
  oneShot("react_gearup", 54, [
    ch("Char", "y", [[0, 0], [16, 12, E.anticipate], [24, 12, E.hold], [30, -9, E.out], [38, 2, E.in], [46, -1, E.out], [54, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [16, -7, E.anticipate], [24, -7, E.hold], [30, 4.5, E.out], [40, -1.4, E.out], [54, 0, E.out]]),
    ch("Char", "x", [[0, 0], [16, -6, E.anticipate], [30, 3.5, E.out], [54, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [16, 0.9, E.anticipate], [24, 0.9, E.hold], [31, 1.09, E.out], [40, 0.985, E.in], [54, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [16, 1.1, E.anticipate], [24, 1.1, E.hold], [31, 0.93, E.out], [40, 1.012, E.in], [54, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [18, 8, E.out], [26, 8, E.hold], [34, -7, E.in], [44, 3, E.out], [54, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [18, 7, E.out], [32, -5, E.in], [54, 0, E.out]]),
    ch("Face", "y", [[0, 0], [16, 5, E.anticipate], [30, -4, E.out], [54, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [16, 0.66, E.anticipate], [26, 0.6, E.hold], [32, 1.1, E.out], [44, 0.9, E.out], [54, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [16, 0.66, E.anticipate], [26, 0.6, E.hold], [32, 1.1, E.out], [44, 0.9, E.out], [54, 1, E.out]]),
    ch("EyeLSolo", "rotation", [[0, 0], [20, -8, E.anticipate], [40, -6, E.loop], [54, 0, E.out]]),
    ch("EyeRSolo", "rotation", [[0, 0], [20, 8, E.anticipate], [40, 6, E.loop], [54, 0, E.out]]),
    eyes([[0, "pill"], [14, "wedge"], [48, "pill"]]),
  ]);

// --- laugh: four decaying giggle bounces ---------------------------------
const laugh = () =>
  oneShot("react_laugh", 66, [
    ch("Char", "y", [[0, 0], [5, 4, E.in], [12, -14, E.out], [20, 3, E.in], [27, -11, E.out], [35, 2, E.in], [42, -8, E.out], [50, 1.5, E.in], [57, -4, E.out], [66, 0, E.in]]),
    ch("Char", "rotation", [[0, 0], [12, 5, E.out], [27, -4.4, E.out], [42, 3.2, E.out], [57, -1.8, E.out], [66, 0, E.out]]),
    ch("Char", "x", [[0, 0], [12, 3.5, E.out], [27, -3, E.out], [42, 2.2, E.out], [66, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [5, 0.92, E.in], [12, 1.09, E.out], [20, 0.95, E.in], [27, 1.07, E.out], [35, 0.965, E.in], [42, 1.05, E.out], [66, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [5, 1.09, E.in], [12, 0.93, E.out], [20, 1.05, E.in], [27, 0.945, E.out], [35, 1.035, E.in], [42, 0.96, E.out], [66, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [16, -7, E.out], [30, 6, E.out], [44, -4, E.out], [58, 2, E.out], [66, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [16, 5, E.out], [31, -3.4, E.out], [46, 2.4, E.out], [66, 0, E.out]]),
    ch("Face", "y", [[0, 0], [12, -4, E.out], [27, 2.5, E.out], [42, -2.5, E.out], [66, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [12, 1.24, E.out], [22, 0.94, E.in], [29, 1.18, E.out], [38, 0.96, E.in], [44, 1.12, E.out], [66, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [13, 1.24, E.out], [23, 0.94, E.in], [30, 1.18, E.out], [39, 0.96, E.in], [45, 1.12, E.out], [66, 1, E.out]]),
    ch("EyeLSolo", "y", [[0, 0], [10, -3, E.out], [60, 0, E.in], [66, 0, E.hold]]),
    ch("EyeRSolo", "y", [[0, 0], [11, -3, E.out], [60, 0, E.in], [66, 0, E.hold]]),
    eyes([[0, "pill"], [8, "arc"], [60, "pill"]]),
  ]);

// --- tapped: direct touch feedback ---------------------------------------
const tapped = () =>
  oneShot("react_tapped", 30, [
    ch("Char", "scaleY", [[0, 1], [4, 0.86, E.in], [12, 1.07, E.out], [19, 0.975, E.in], [30, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [4, 1.15, E.in], [12, 0.93, E.out], [19, 1.02, E.in], [30, 1, E.out]]),
    ch("Char", "y", [[0, 0], [4, 9, E.in], [12, -7, E.out], [20, 2, E.in], [30, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [6, -2.4, E.in], [14, 2.6, E.out], [22, -1, E.out], [30, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [6, 5, E.out], [15, -4, E.in], [30, 0, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [7, 4.5, E.out], [16, -3.4, E.in], [30, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [4, 0.4, E.in], [12, 1.26, E.back], [22, 1.02, E.out], [30, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [4, 0.4, E.in], [12, 1.26, E.back], [22, 1.02, E.out], [30, 1, E.out]]),
    ch("EyeLSolo", "scaleX", [[0, 1], [4, 1.2, E.in], [12, 1.16, E.back], [30, 1, E.out]]),
    ch("EyeRSolo", "scaleX", [[0, 1], [4, 1.2, E.in], [12, 1.16, E.back], [30, 1, E.out]]),
    eyes([[0, "pill"], [10, "round"], [26, "pill"]]),
  ]);

// --- recoil: shoved, spins off balance, gathers itself -------------------
const recoil = () =>
  oneShot("react_recoil", 54, [
    ch("Char", "x", [[0, 0], [4, 5, E.in], [13, -26, E.out], [22, -18, E.loop], [34, 6, E.in], [44, -2, E.out], [54, 0, E.out]]),
    ch("Char", "rotation", [[0, 0], [4, -3, E.in], [13, 16, E.out], [24, 9, E.loop], [36, -6, E.in], [46, 2, E.out], [54, 0, E.out]]),
    ch("Char", "y", [[0, 0], [13, -8, E.out], [26, 4, E.in], [36, -2, E.out], [54, 0, E.out]]),
    ch("Char", "scaleY", [[0, 1], [4, 1.04, E.in], [13, 0.92, E.out], [26, 1.05, E.in], [36, 0.98, E.out], [54, 1, E.out]]),
    ch("Char", "scaleX", [[0, 1], [4, 0.96, E.in], [13, 1.09, E.out], [26, 0.955, E.in], [36, 1.018, E.out], [54, 1, E.out]]),
    ch("HandlePivot", "rotation", [[0, 0], [10, 13, E.out], [24, -10, E.in], [38, 6, E.out], [54, 0, E.out]]),
    ch("HandlePivot", "x", [[0, 0], [10, 10, E.out], [26, -7, E.in], [54, 0, E.out]]),
    ch("HandlePivot", "y", [[0, 0], [10, 6, E.out], [26, -4, E.in], [54, 0, E.out]]),
    ch("Face", "x", [[0, 0], [12, 7, E.out], [28, -5, E.in], [54, 0, E.out]]),
    ch("Face", "rotation", [[0, 0], [12, -4, E.out], [30, 3, E.in], [54, 0, E.out]]),
    ch("EyeLSolo", "scaleY", [[0, 1], [10, 1.3, E.out], [26, 1.15, E.loop], [36, 0.72, E.in], [48, 0.95, E.out], [54, 1, E.out]]),
    ch("EyeRSolo", "scaleY", [[0, 1], [10, 1.3, E.out], [26, 1.15, E.loop], [36, 0.72, E.in], [48, 0.95, E.out], [54, 1, E.out]]),
    ch("EyeLSolo", "rotation", [[0, 0], [36, -9, E.in], [50, -3, E.out], [54, 0, E.out]]),
    ch("EyeRSolo", "rotation", [[0, 0], [36, 9, E.in], [50, 3, E.out], [54, 0, E.out]]),
    eyes([[0, "pill"], [6, "round"], [34, "wedge"], [50, "pill"]]),
  ]);

export const REACTIONS = [
  { key: "acknowledge", trigger: "acknowledge", build: acknowledge },
  { key: "surprise", trigger: "surprise", build: surprise },
  { key: "celebrate", trigger: "celebrate", build: celebrate },
  { key: "frustrated", trigger: "frustrated", build: frustrated },
  { key: "relieved", trigger: "relieved", build: relieved },
  { key: "wobble", trigger: "wobble", build: wobble },
  { key: "gearup", trigger: "gearUp", build: gearUp },
  { key: "laugh", trigger: "laugh", build: laugh },
  { key: "tapped", trigger: "tapped", build: tapped },
  { key: "recoil", trigger: "recoil", build: recoil },
];

export function buildReactions() {
  return REACTIONS.map((r) => {
    const anim = r.build();
    return { ...r, animation: anim.name, anim };
  });
}

// --- blink layer ----------------------------------------------------------
// These key EyeLBlink / EyeRBlink only, so an on-demand blink never fights the
// mood's own eye acting further down the chain.
export function buildBlinks() {
  const close = (frame, { down = 3, hold = 2, up = 5, min = 0.06, over = 1.1 } = {}) => [
    [frame, 1],
    [frame + down, min, E.in],
    [frame + down + hold, min, E.hold],
    [frame + down + hold + up * 0.6, over, E.out],
    [frame + down + hold + up, 1, E.out],
  ];
  const widen = (frame, len) => [
    [frame, 1],
    [frame + 3, 1.14, E.in],
    [frame + 5, 1.14, E.hold],
    [frame + 8, 0.97, E.out],
    [frame + len, 1, E.out],
  ];

  const single = oneShot("blink_single", 14, [
    ch("EyeLBlink", "scaleY", close(0)),
    ch("EyeRBlink", "scaleY", close(1)),
    ch("EyeLBlink", "scaleX", widen(0, 13)),
    ch("EyeRBlink", "scaleX", widen(1, 13)),
  ]);

  const double = oneShot("blink_double", 30, [
    ch("EyeLBlink", "scaleY", [...close(0), ...close(14).map(([f, v, e]) => [f, v === 1 ? 1 : v + 0.08, e]), [30, 1, E.out]]),
    ch("EyeRBlink", "scaleY", [...close(1), ...close(15).map(([f, v, e]) => [f, v === 1 ? 1 : v + 0.08, e]), [30, 1, E.out]]),
    ch("EyeLBlink", "scaleX", [...widen(0, 12), ...widen(14, 12), [30, 1, E.out]]),
    ch("EyeRBlink", "scaleX", [...widen(1, 12), ...widen(15, 12), [30, 1, E.out]]),
  ]);

  // Wink: one lid drops slowly while the other eye opens wider — a real wink
  // is asymmetric in both timing and amplitude, not one eye closing.
  const wink = oneShot("blink_wink", 27, [
    ch("EyeLBlink", "scaleY", [[0, 1], [6, 0.07, E.in], [14, 0.07, E.hold], [20, 1.12, E.back], [27, 1, E.out]]),
    ch("EyeLBlink", "scaleX", [[0, 1], [6, 1.18, E.in], [20, 1.06, E.out], [27, 1, E.out]]),
    ch("EyeLBlink", "y", [[0, 0], [8, 3, E.in], [20, -1, E.out], [27, 0, E.out]]),
    ch("EyeRBlink", "scaleY", [[0, 1], [7, 1.16, E.back], [18, 1.14, E.hold], [27, 1, E.out]]),
    ch("EyeRBlink", "scaleX", [[0, 1], [7, 1.1, E.back], [18, 1.08, E.hold], [27, 1, E.out]]),
    ch("EyeRBlink", "y", [[0, 0], [8, -2, E.out], [27, 0, E.out]]),
  ]);

  return [
    { key: "single", trigger: "blink", anim: single },
    { key: "double", trigger: "blinkDouble", anim: double },
    { key: "wink", trigger: "wink", anim: wink },
  ];
}

export { eyesSplit };
