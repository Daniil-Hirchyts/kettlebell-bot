# Validation report

Rebuilt and validated on 2026-09-11 with `rive-mcp-server@0.5.0` and its bundled
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
| File size | 1,063 KB (1,088,385 bytes), 0 embedded image assets |
| Artboards | 1 — `KettlebellBot`, 512 x 512, transparent |
| Rig nodes | 30 named transforms, including 2 `Solo` groups |
| Vector shapes | 206 — 18,578 Bézier contours (63 cubic + 38,149 straight vertices; 18,543 of the contours are grain specks), 18 primitives, 12 gradient fills, 26 solid fills, 168 stroke-only shapes (157 grain buckets + 11 edge-light runs) |
| Animations | 91 (37 of them the `facing` poses, one every 10 degrees) |
| Tracks / keyframes | 2667 / 21000 |
| State machine | `KettlebellBotMachine` — 24 inputs, 9 layers, 49 states, 81 transitions |
| Easing distribution | 15241 `smooth` (only between dense turn samples, where the value curve itself already carries the easing), 2293 named cubics (`ease-in-out` 658, `ease-out` 636, `ease-out-back` 479, `ease-in` 336, `snap` 95, `ease-in-back` 52, `emphasized-decel` 37), 716 `hold`, 2750 with no interpolator (single-pose tracks, and the first keyframe of every track) |

## Build-time guards

`scripts/build-rive.mjs` runs `validateScene()` before writing anything. All
nine error classes pass; the warning class (transform track with no easing) is
empty.

Rule 8: a layer that shares channels with an earlier layer must have a
track-free entry state, or it can never yield those channels back. Added with
the `Turn Shot` layer and verified by deliberately breaking it.

Rule 9 is the newest: the eye path must stay on the bell and must reach its edge
at profile. The eyes are decals on the body, so the turn model has exactly two
ways to be wrong about them and both have shipped. Ride too small a circle and
an eye floats inside the form at profile; ride too large a one and it swings off
the outline mid-turn — which is the dangerous direction, because `FaceRoot` is
clipped to `body-mask` and the eye is then trimmed away rather than drawn in the
wrong place, leaving every pixel assertion about turned-away frames still
passing. The rule fails if any of the seven eye variants, measured on its own
bounding box, leaves the silhouette by more than 4 units at any angle, or if the
eye reaches under 85% of the half-width at profile. Verified to bite in both
directions.

Real defects caught by these guards or by the state-machine suite, and fixed:

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
3. **The keyframe reducer dropped the shoulders of flat runs**, so every scripted
   turn ramped its back panel and eye opacity from frame zero instead of holding.
   The back detail showed through the front of the character and the eyes dimmed
   during spins. Reported from the playground, not caught by the suite.
4. **The turn shots shared a layer with level-triggered `status` conditions**, so
   firing one entered the shot state and was immediately dragged back out. The
   360 tour, which opens on a hold, appeared to do nothing at all. Fixed with the
   `Turn Shot` layer; rule 8 and the new `shots` test pass both guard it.
5. **Ghosts in the `facing` blend, and a thumb for a handle at profile.**
   Reported from the playground, not caught by the suite, which only ever held
   facings on the 30-degree poses. Between poses the blend averaged every fade:
   the handle face half-transparent over walls too narrow for it, the see-through
   window closed to a zero-width sliver drawn as a hairline, the far eye grey.
   Fixed by drawing the handle as its exact projection with an opaque face, a
   lens-shaped window that closes to a point, an eye that thins out instead of
   fading, and a pose every 10 degrees. Reproduced and re-checked by driving
   `facing` on the live machine at 65–105 degrees.

## Runtime

| Tool | Result |
|---|---|
| `riv_inspect` | All 91 animations, 24 inputs and their initial values present and correctly typed |
| `riv_lint` | **0 errors, 0 warnings**, 114 informational `motion-lopsided-scale` notes |
| `riv_critique` | Two full iterations (`previews/critique/pass1-*`, `pass2-*`) plus a final confirmation pass, and a pass on the key light and handle thickness (`volume-*`) |
| `riv_play_state_machine` | 5 passes, 108 steps, 68 captures — see below |
| `riv_import_svg` | Both generated SVGs re-import cleanly (192 and 239 shapes) |
| `riv_render_apng` / `riv_render_gif` | 45 previews, no failures |

### About the 114 informational lint notes

Every one is `motion-lopsided-scale` — one scale axis animated without the other.
96 of them are on the yaw system (`EyeL`, `EyeR`, `TurnFront`, `TurnBack`,
`HandleFace`, `WallFar`, `WallFarEdge`, `HandleBridge`, `BodyPlate`, and the
spins' squash on `Yaw`), where single-axis scaling is the correct physics:
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
| Turnaround, every 30 degrees of the 37 facing poses | `previews/sheets/turnaround.png` |
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
