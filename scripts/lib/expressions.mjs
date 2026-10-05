// Optional eye-only poses. Automatic mode yields back to the current mood or
// reaction; the pose never owns gaze, turning, lids or the character's body.
import { EYE_VARIANTS } from "./geometry.mjs";
import { eyes, pose } from "./motion.mjs";

export const buildEyeExpressions = () => EYE_VARIANTS.map((variant, index) => ({
  key: variant.key, value: index + 1, anim: pose(`eyes_${variant.key}`, eyes([[0, variant.key]])),
}));
