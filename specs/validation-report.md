# Validation report

Validated on 2026-09-04 with `rive-mcp-server@0.5.0` and its bundled official Rive canvas runtime.

## Structural checks

- `.riv` fingerprint present; format version 7.0
- 1 artboard, 10 animations, 1 state machine, 4 inputs
- 7 named transform nodes
- 4 vector shapes, 5 closed Bézier paths, 33 cubic vertices
- 0 embedded image assets
- Body, Handle, FaceTransform, EyeLeft, and EyeRight are independently addressable
- transparent runtime output verified

## Runtime checks

- `riv_create`: official-runtime validation passed
- `riv_inspect`: all identifiers and timings present
- `riv_lint`: 0 errors, 0 warnings, 5 informational perspective-scale suggestions
- `riv_critique`: completed across the original build plus two post-revision passes (`motion-v2-*` and `motion-v3-*`)
- `riv_ab_compare`: V2/V3 thinking comparison saved to `previews/comparisons/v2-v3-thinking.gif`
- `riv_play_state_machine`: Idle, Thinking, Working, Waiting, BlockedEnter, BlockedIdle, Blink, Done, and Acknowledge transitions observed
- small-size renders: 24, 32, 64, 128, and 512 px
- small-size animated renders: 32 px Thinking and Working, with four focused turn-state captures

## Local editor check

The installed Rive Desktop 0.8.5674 opens `kettlebell-bot.riv` by filename but shows a blank editor canvas. The file continues to validate and render correctly through the current official Rive runtime used by rive-mcp. This is treated as a local editor-version compatibility mismatch. The `.riv`, SVG, imported Bézier fragment, complete scene JSON, and iteration files have all been preserved.
