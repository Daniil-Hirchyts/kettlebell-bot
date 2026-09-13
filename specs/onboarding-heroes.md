# Onboarding heroes

Four independent looping hero illustrations for a portrait onboarding flow.
Each one is its own `.riv` with the mascot as the protagonist. They contain no
text, numbers or UI chrome, and have a transparent background.

| Hero | File | Length | Size |
|---|---|---:|---:|
| Character introduction | `rive/onboarding/onboarding_character_intro.riv` | 6.8 s | 781 KB |
| Building a plan | `rive/onboarding/onboarding_plan.riv` | 7.0 s | 779 KB |
| Exercise discovery | `rive/onboarding/onboarding_discovery.riv` | 7.0 s | 801 KB |
| Progress over time | `rive/onboarding/onboarding_progress.riv` | 7.0 s | 792 KB |

Previews: `previews/onboarding/<name>.gif` (light surface, 360 px) and
`<name>.apng` (transparent, 240 px). There is also a labelled
`<name>-contact.png` of one loop and a `<name>-seam.png` across the loop point.

## Runtime identifiers

Every file has the same shape, so one integration path covers all four:

- Artboard: the hero's name (`onboarding_plan`, …), 720 x 960, transparent
- Timeline: the hero's name, looping
- State machine: `Onboarding`, one state that plays the timeline. No inputs.

Autoplaying the default state machine is enough. For example, in SwiftUI:

```swift
RiveViewModel(fileName: "onboarding_plan", stateMachineName: "Onboarding").view()
```

Fit it with `contain` in a roughly 3:4 hero area. The focal action is kept
well inside the frame, so a slightly wider or taller slot only adds margin.

## Shared design language

- **The mascot is the real rig.** `scripts/lib/onboarding/kit.mjs` imports
  `buildGroups()`/`buildShapes()` from `scene.mjs` and only places the rig.
  Grain, key light, turn model and eye variants are identical to the avatar. The
  one addition is a soft ground shadow that tightens when the bot leaves the
  ground.
- **Props are made from the mascot's materials.** They use the charcoal body
  gradient, the off-white of its eyes and the rim grey. The kettlebell prop is
  the mascot's own silhouette, with no face, lit by the same edge light. The
  sparkle is its celebrate eye.
- **Palette.** The avatar's two-value treatment is used for anything that acts.
  The light-scheme surfaces from `riv_design_tokens` (seed `#1B1D22`, mood
  `tech`) are used for anything that is structure: cards `#FFFFFF`, wells
  `#E2E8F6`, outline `#BEC4D2`, muted `#CCCED1`, primary `#6F7178`. No new hues.
- **Scale.** Token radii and strokes are multiplied by `PT = 1.8`, the ratio of
  the 720-unit artboard to a roughly 390 pt display width.
- **Composition varies, the family does not.** The mascot moves to a different
  place in each hero:
  - intro: centre
  - plan: lower right, under a structure
  - discovery: lower left, in front of a card fan
  - progress: lower centre, inside the progress elements

## Motion rules, and where they live

| Rule from the brief | How it is built |
|---|---|
| Eyes react before the body | Every beat keys the gaze first, and the body's facing curve follows 6–12 frames later |
| Anticipation on major actions | `hop()`, `popIn()` and the per-scene moves all dip or crouch before they go |
| Fast moves overshoot, objects settle | `ease-out-back` arrivals, and landing squashes with one rebound |
| Secondary objects lag | The handle trails the body. Cards that make room move a beat behind the card that moves |
| Exits faster, clean ease-out | `driftAway()` and the fold/restack moves are shorter than entrances and accelerate. Opacity holds until the prop has mostly shrunk, so layered shapes never show through each other |
| Idle is extremely subtle | Breath lives on `Touch` for the whole loop, at 1.3–1.6 units and under 1% scale |
| No linear easing | `validateLoop` rejects a linear segment on any transform |
| One primary action at a time | Beats are staged in sequence (see below). Overlaps are only follow-through or a small accent |

## Beat sheets

### onboarding_character_intro (6.8 s)

| Time | Beat |
|---|---|
| 0.00–0.77 | Idle, eyes resting down and to the side, one blink |
| 0.77 | Eyes snap to the viewer and widen |
| 1.00–1.60 | Then the body: squash, lift, friendly tilt, squinting happy eyes |
| 1.90–2.40 | A kettlebell pops in beside the bot. Eyes glance at it, and the body turns after them |
| 2.83–4.27 | A weight plate crosses overhead, spinning. Eyes track it and the body follows a beat late |
| 3.87–4.80 | Float settles, turns back to the viewer (rest) |
| 4.87–5.87 | Small happy hop, with three sparkles popping in sequence |
| 5.87–6.23 | The kettlebell drifts away |
| 5.93–6.80 | Eyes drift back to rest, idle into the loop |

### onboarding_plan (7.0 s)

| Time | Beat |
|---|---|
| 0.13–0.80 | Empty slots wake up, top to bottom |
| 0.80–1.53 | Eyes look up first. Block A (kettlebell) drops in with a landing squash, its node fills, and the bot nods |
| 1.77–2.57 | Block B (upper body) slides in on an arc with a different easing |
| 2.70–3.20 | Block C (lower body) pops into slot 3 |
| 3.47–4.60 | Block B is singled out: it lifts, scales up and an ink ring closes on it |
| 4.03–4.43 | Block A gets a check that draws itself |
| 4.53–4.90 | The bot's eyes check C, then the slot C should go to, then C again |
| 4.87–5.93 | C lifts out and arcs up past the others into slot 1. A and B step down a beat apart to make room |
| 5.80–6.80 | The bot is pleased: a small hop and happy eyes |
| 6.40–7.00 | Blocks fold into their slots, nodes empty, slots go quiet |

Blocks carry no bars or lines: a block's length is its duration.

### onboarding_discovery (7.0 s)

| Time | Beat |
|---|---|
| 0.60–1.30 | The stack lifts, then fans out with staggered overshoot. Eyes sweep across |
| 1.60–2.50 | The right card passes forward while the left recedes and dims |
| 2.60–3.63 | The legs, then the core, glow on the body-map card |
| 3.50–4.10 | A dumbbell rises out from behind the right card and bobs |
| 4.23 | A heart pops onto the centre card. The bot does a small bounce |
| 4.60–5.20 | The centre card grows into focus, and the others step back and dim |
| 5.10–6.03 | Its figure does one kettlebell swing. The bot copies it a beat late, squatting into the hinge and stretching at the top |
| 6.03–7.00 | Focus lets go, the heart and dumbbell tidy away, cards restack with one soft bump |

Hierarchy: the focus card is the only card that scales up past the rest, the
mascot is the only other thing that acts, and supporting cards only shift or
dim.

### onboarding_progress (7.0 s)

| Time | Beat |
|---|---|
| 0.00–0.47 | Low energy: stubby bars, a faint body outline, an ember, sleepy eyes |
| 0.47 | The bot wakes up to it |
| 0.63–2.77 | Three bars climb, each higher, darkening from muted to charcoal. Eyes and body follow |
| 2.67–3.30 | The streak flame catches |
| 3.33–3.83 | The body map turns into view |
| 3.90–4.40 | Shoulders, core and legs light up in sequence |
| 4.53–5.00 | A trail launches off the tallest bar and arcs up to a new peak |
| 4.97–5.40 | A sparkle lands there with a ring burst |
| 5.23–6.83 | The bot hops, then holds a proud chest-out |
| 6.30–7.00 | The cycle closes, never reading as a loss:<br>• the trail runs on through its peak<br>• the star floats off<br>• the body turns away and the flame settles to an ember<br>• each bar rises away and a fresh stub grows in its place |

## Loop guarantees

`scripts/lib/onboarding/kit.mjs`:

- **Rest values.** `Timeline` gives every channel a rest value. It starts
  there, and `build()` closes it back there with a hold. An ease would quietly
  drift a visible object across the whole gap.
- **`validateLoop`** runs before anything is written and fails the build when:
  - a track, fill colour or eye-shape switch ends somewhere other than where it
    started
  - a transform has a linear segment
  - a loop is outside 5–7 s
  - there is any text, or an open path with a fill
  - a hold changes a value while its object is visible. Visible means effective
    opacity through every ancestor, or a trimmed stroke that is not empty. That
    is the one way a hidden reset could pop on screen.
- **Facing.** A facing curve has to end on the facing and dynamics it started
  on.

`scripts/render-onboarding.mjs` then renders two loops back to back on whole
animation frames. It measures the frame-to-frame change across both and
requires two things:

- the step across the loop point looks like its neighbours
- frame *k* of the second loop matches frame *k* of the first

## Verification

Run on 2026-09-13:

| Check | Result |
|---|---|
| `validateLoop` | 0 errors on all four |
| Seam step (mean channel change across the loop point, 0–255) | 0.038 · 0.048 · 0.028 · 0.030. Whole-loop p90 is 2.8–6.1 |
| Loop 2 vs loop 1 | ≤ 0.013 on every frame (eye-shape switch frames are excluded: a sample landing exactly on a switch resolves either side by float rounding) |
| `riv_lint` | 0 errors, 0 warnings. Info only:<br>• `motion-no-stagger` reads every prop's invisible rest key at frame 0 as a simultaneous fade-in; the actual fades are staggered<br>• `motion-lopsided-scale` flags deliberate single-axis moves (folds, turns, flame flicker) |
| `riv_inspect` | One 720 x 960 artboard, one looping timeline and the `Onboarding` state machine per file |
| State machine vs timeline | Identical, one frame later: the state machine's entry step |
| Determinism | Two consecutive builds are byte-identical |
| Avatar asset | `npm run verify` still byte-identical. The heroes only import the rig |

## Known limitations

- **Light surfaces only.** The charcoal props lose contrast on a near-black
  background, just as the charcoal mascot does.
- **About 780–800 KB per file.** Almost all of it is the mascot's vector grain,
  kept so the mascot matches the avatar exactly. Lower `GRAIN` density would
  shrink it for every hero at once, at the cost of that match.
- **The body map is several overlapping shapes.** While it fades, and in its
  faint rest state, its joints show slightly through each other. The single-shape
  bars and the late-fading exits avoid this elsewhere.

## Building

```sh
npm run build:onboarding      # validate + write the four .riv and scene JSON
npm run previews:onboarding   # contact sheets, seam strips, seam report, GIF + APNG
node scripts/render-onboarding.mjs --review --only plan   # fast loop while iterating
```
