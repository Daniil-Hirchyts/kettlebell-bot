# Validation report

Rebuilt and validated on 2026-09-04 with `rive-mcp-server@0.5.0` and its bundled
official Rive canvas runtime, on macOS 27.0 / Node 26.8.1.

Reproduce everything with:

```sh
npm run build && npm run test && npm run previews && npm run sheets
```

## Structural

| Check | Result |
|---|---|
| `riv_create` | Validated with the official Rive runtime |
| Format version | 7.0 |
| File size | 257 KB, 0 embedded image assets (the vector grain is ~76 KB of that) |
| Artboards | 1 — `KettlebellBot`, 512 x 512, transparent |
| Rig nodes | 24 named transforms, including 2 `Solo` groups |
| Vector shapes | 53 — 2070 Bézier contours (29 cubic + 4146 straight vertices, 2059 of the contours being grain specks), 14 primitives, 5 gradient fills, 48 solid fills |
| Animations | 67 |
| Tracks / keyframes | 1282 / 12304 |
| State machine | `KettlebellBotMachine` — 24 inputs, 8 layers, 48 states, 80 transitions |
| Easing distribution | 10223 cubic, 853 hold, 1228 linear (linear only between dense turn samples, where the value curve itself already carries the easing) |

## Build-time guards

`scripts/build-rive.mjs` runs `validateScene()` before writing anything. All six
error classes pass; the warning class (transform track with no easing) is empty.

Two real defects were caught by these guards during the rebuild and fixed:

1. **Keyed `x`/`y` is absolute in Rive.** The mood loops were authoring handle and
   face translation as deltas, which snapped both nodes to their parent's origin —
   the handle vanished behind the body in every state-machine render while
   single-animation renders looked correct. Fixed by moving the rest offsets onto
   dedicated `HandleRoot` / `FaceRoot` nodes and adding the guard that makes it
   impossible to reintroduce.
2. **The neutral facing pose did not match the static rig.** Eye foreshortening at
   facing 0 evaluated to 0.96, not 1.0, so previews rendered without the Turn
   layer disagreed with the state machine by 4%. Fixed by normalising the
   foreshortening curve, now asserted by the `face_000` guard.

## Runtime

| Tool | Result |
|---|---|
| `riv_inspect` | All 67 animations, 24 inputs and their initial values present and correctly typed |
| `riv_lint` | **0 errors, 0 warnings**, 78 informational `motion-lopsided-scale` notes |
| `riv_critique` | Two full iterations (`previews/critique/pass1-*`, `pass2-*`) plus a final confirmation pass |
| `riv_play_state_machine` | 4 passes, 95 steps, 63 captures — see below |
| `riv_import_svg` | Both generated SVGs re-import cleanly (11 and 71 shapes) |
| `riv_render_apng` / `riv_render_gif` | 45 previews, no failures |

### About the 78 informational lint notes

Every one is `motion-lopsided-scale` — one scale axis animated without the other.
60 of them are on the yaw system (`EyeL`, `EyeR`, `TurnFront`, `TurnBack`,
`HandlePlate`, `BodyPlate`), where single-axis scaling is the correct physics:
rotating about a vertical axis changes projected width and nothing else. Adding a
companion Y scale there would be a visible defect, not a fix. The remaining 18 are
eyelid and body squashes where `withVolume()` already supplies a bounded
companion axis; the linter's heuristic wants a larger companion than an eyelid
should have.

### State-machine coverage

| Pass | Steps | States entered | Result |
|---|---:|---:|---|
| `moods` | 17 | 25 | All 16 mood states plus their yaw counterparts |
| `reactions` | 31 | 26 | All 10 reactions, each fired from a different mood to prove the Reaction layer overrides whatever is underneath |
| `turn` | 25 | 20 | `facing` swept 0→360 through the blend, all 4 turn triggers, all 6 scripted yaw moods, return to the blend |
| `interaction` | 22 | 10 | Both gaze axes including a diagonal, `intensity` 0/1/0.5, hover→press→release→leave, all 3 blinks, `tapped` |

Every input is exercised, and the test fails if an expected state is never
entered. Captures land in `previews/states/`; the machine-readable summary is
`previews/states/state-machine-report.json`.

## Visual evidence

| Artefact | Path |
|---|---|
| Turnaround, all 13 facing poses | `previews/sheets/turnaround.png` |
| All 16 emotional states, from the live machine | `previews/sheets/emotions.png` |
| All 10 reactions | `previews/sheets/reactions.png` |
| Gaze, intensity, touch and blinks | `previews/sheets/interaction.png` |
| The 7 eye shape variants | `previews/sheets/eye-shapes.png` |
| Animated preview per animation | `previews/animations/` (42 APNG + 3 GIF) |
| Critique filmstrips, onion skins and contact sheets | `previews/critique/` (`pass1-*` before, `pass2-*` after the fixes, `final-*` confirmation) |
| Vector turnaround, editable | `assets/svg/kettlebell-bot-turnaround.svg` |

## Known limitations

- **Rive Desktop 0.8.5674** opens the file by name but shows a blank canvas. The
  same format-7.0 file validates, renders, and runs its state machine in the
  current official runtime used by rive-mcp, so this is recorded as a local
  editor-version mismatch. Use a current Rive editor, `npm run studio`, or the
  scene JSON for inspection.
- **Small sizes are out of scope by design.** Below roughly 48 px the depth
  fields and back detail stop contributing. This was an explicit brief decision in
  favour of mobile-avatar quality.
- **`fill.feather`** is not used: rive-mcp's Canvas2D preview does not render it,
  so the soft edges are radial gradients instead, which render identically
  everywhere.
