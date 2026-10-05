# Validation report

## Additional eyes and restrained particles — 2026-10-05

This addition preserves the accepted bot and its acting, adds seven optional
rounded eye shapes, and introduces four small grayscale particle effects. App
integration stays outside this library update.

| Structural check | Result |
|---|---|
| Asset | 1,307,348 bytes; vector only, no embedded images |
| Artboard / machine | `KettlebellBot`, transparent 512 × 512 / `KettlebellBotMachine` |
| Rig / artwork | 55 groups, 244 shapes; original artwork plus fourteen eyes and a six-slot particle pool |
| Animation data | 122 animations, 4,403 tracks, 34,692 keyframes |
| State machine | 36 inputs, 12 layers, 80 states, 127 transitions |
| Compatibility | Existing input names/defaults, mood values and reaction behavior preserved; `eyes` defaults to automatic and all particles start hidden |
| Eye geometry | Original scale 1.65, y=-10 and separation 94 unchanged; every new variant fits the existing bounds |
| Effects | Four explicit triggers; maximum six particles; grayscale only |

| Verification | Result |
|---|---|
| Build / scene validation | Official runtime accepts the asset; all guards and fault-injection checks pass |
| `npm run test` | 17 runtime passes, 446 steps, 255 captures; every `missing` list empty |
| `npm run verify` | Scene JSON matches source; clean rebuilt binary byte-identical |
| `npm run lint:riv` | 0 errors, 0 warnings; 270 informational `motion-lopsided-scale` and 3 `motion-no-stagger` notes |
| Previews / contact sheets | 59 animated previews; fourteen-glyph sheet; full eye/particle facing sheets |
| `npm run review` | 184 samples: twelve accepted examples and eleven additions, four sizes, two surfaces |
| Playground build / lint | TypeScript, Vite and wrapper/playground lint pass |
| Browser | Runtime connected; fourteen shapes plus Automatic, four effects and visibility toggle work; no browser errors |
| Accepted appearance | Calm, cheeky, appreciate, 50°/90°/180° facing samples at 160 px are pixel-identical to the saved accepted binary |

The scale notes concern deliberate projection, emitter radius and bounded scale
compensation. The stagger heuristic sees each particle's frame-zero opacity reset;
the emitted particles actually begin at staggered frames. No palette or animated
eye-color inputs are added.

### Runtime coverage

The seven existing passes retain coverage of all moods, reactions, turns,
interaction, reaction interruption and the four newer moods through six facings.
Ten additional passes cover the new controls:

| Pass | Steps | Captures | Coverage |
|---|---:|---:|---|
| eyes | 19 | 17 | All fourteen selections; reaction/blink composition; return to automatic |
| eyeturn | 49 | 42 | Seven additions at 0, 45, 90, 180, 270, 315 degrees |
| effects | 9 | 8 | Each effect without a body reaction; return to invisible idle |
| fxreplace | 20 | 11 | Rapid replacement/restart, mute/unmute, reaction/eye/turn/hover/press/blink composition |
| fxturn / fxturn2 | 37 each | 12 each | All four effects at six facings |
| Four paired muted passes | 103 total | 43 total | Identical timelines at intensity 0 provide pixel baselines for live visibility, clean exits, muted playback and back-face occlusion |

Every new eye's back-facing capture contains no bright eye pixels. Visible
effects differ from their muted baseline while idle, muted and full-back samples
match exactly. Particle-only playback enters no reaction animation. Full-pool
reset guards reject missing tracks and visible endpoints; ownership guards
reject effects writing character channels and eye overrides without a yielding
idle state. Existing full-turn eye silhouette/profile thresholds remain intact.

### Visual review

Two critique passes cover all four effects in
`previews/critique/accents{1,2}-*`. The first pass exposed marks that were too
small/faint at 160 px. The second pass enlarges and strengthens them while keeping
the pool sparse; dust moves to the narrower base radius. Filmstrips, onion skins
and motion reports were reviewed, with seven-axis scores in `design-qa.md`.

Fourteen eye shapes are reviewed in `eye-shapes.png`. Eye-turn and particle-turn
sheets confirm projected attachment and occlusion. New combinations are reviewed
at 44, 64, 160 and 512 px on light/dark surfaces in
`previews/sheets/accents-{light,dark}-{size}.png`; the accepted examples remain in
`expansion-*`. No clipping appeared in these samples. Crescents and motes remain
subtle at 44–64 px; the face carries the read at badge sizes.

The older sections below retain the QA history of the accepted monochrome
revision and original rig. Their counts and removed-feature statements describe
those earlier snapshots.

## Accepted monochrome baseline — 2026-10-05

The generated Rive asset and React playground were rebuilt following feedback:
remove colored eyes and particles, bring the new emotions closer to the original
character, and enlarge the eyes. App integration is outside this update.

| Structural check | Result |
|---|---|
| Asset | 1,114,626 bytes; vector only, no embedded raster assets |
| Artboard / machine | `KettlebellBot`, transparent 512 × 512 / `KettlebellBotMachine` |
| Rig / artwork | 30 groups, 206 shapes; original body, handle, lighting and grain |
| Animation data | 101 animations, 2,957 tracks, 22,717 keyframes |
| State machine | 30 inputs, 9 layers, 59 states, 101 transitions |
| Compatibility | Existing mood values 0–15, input names/defaults and triggers preserved; four moods and six reactions appended |
| Eye geometry | Original seven variants; scale 1.65 versus 1.4, centres at y=-10, separation 94 |
| Removed draft features | No accent/effects inputs, particle geometry, palette layers or animated eye colors |

| Verification | Result |
|---|---|
| `npm run build` | Scene validation passed; binary accepted by the official runtime |
| `npm run test` | Scene contract and fault-injection checks passed; all seven runtime passes passed |
| `npm run verify` | Rebuilt binary byte-identical; scene JSON matches source |
| `npm run lint:riv` | 0 errors, 0 warnings; 121 informational `motion-lopsided-scale` notes |
| `npm run previews` / `npm run sheets` | 55 animated previews and current contact sheets generated |
| `npm run review` | 96 samples: twelve expressions/reactions, four sizes, two surfaces |
| `npm run playground:build` | TypeScript and Vite passed, including the reference wrapper |
| `npm --prefix playground run lint` | Playground and reference wrapper passed |
| Browser | Runtime connected; mood/reaction controls reviewed, no browser errors; wrapper and canvas match all four selected sizes (44, 64, 160, 512) |

The informational lint notes concern intentional single-axis turn projection and
bounded eyelid/body compensation. There are no lint errors or warnings. Existing
mood motion is retained; its rendered eyes intentionally change with the shared
geometry enlargement.

### Runtime coverage

The suite drives 172 steps and saves 110 captures. Every pass has an empty
`missing` list in `previews/states/state-machine-report.json`.

| Pass | Steps | Captures | Coverage |
|---|---:|---:|---|
| moods | 21 | 21 | All twenty moods, original scripted yaw states, return to calm |
| reactions | 49 | 16 | All sixteen reactions from underlying moods, return after each shot |
| turn | 25 | 20 | Facing blend, scripted yaw moods and four turn shots |
| interaction | 22 | 16 | Gaze, energy, hover, press, tap and three blink triggers |
| shots | 13 | 5 | Turn interruption and return to facing |
| composition | 14 | 8 | New moods, reaction interruption, turn, gaze, blink, hover and press |
| geometry | 28 | 24 | Four new moods at facings 0, 45, 90, 180, 270 and 315; back views have no bright eye pixels |

Scene guards retain the full-turn bounds check for all seven glyphs: no more
than four units outside the silhouette and at least 85% profile reach. The
larger eye projection uses a two-unit surface inset rather than relaxing these
thresholds. The front runtime shot contains 1,294 bright eye pixels, above its
new minimum of 1,150; back-facing assertions remain zero. Additional guards
reject duplicate channels, invalid color keys, shared-channel ownership errors, loop seam mismatch,
and a reaction idle state that fails to yield its channels. New reactions key
all body/expression channels so interruptions do not retain a previous pose.

### Visual review

Two critique passes cover all ten new mood and reaction animations, with
filmstrips, onion skins and displacement reports in
`previews/critique/refinement1-*` and `refinement2-*`. The first pass exposed
square-looking exhausted eyes made from compressed pills. The second pass uses
the original rounded slit for exhausted/recovering, while the other additions
use the original pill, wedge, arc, round and star glyphs. The seven-axis scores
and specific changes are recorded in `design-qa.md`.

`previews/sheets/expansion-{light,dark}-{44,64,160,512}.png` shows twelve examples
on each size/surface. No clipping was found in these samples. Closed recovering
eyes are subtle at badge sizes; breathing and nod timing read more clearly at
160–512 px. `previews/sheets/geometry.png` shows each new mood at six facings,
and `turnaround.png` covers the enlarged neutral eyes through the full turn.
Eyes remain off-white throughout; there are no particles or color selectors in
the asset, React wrapper or playground.

## Historical baseline — 2026-09-11

The report below records the previous asset and its earlier QA history. Counts
and preview references in this historical section describe that version.

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
