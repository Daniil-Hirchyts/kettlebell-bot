# Design QA — motion system rebuild

## What was compared

| | |
|---|---|
| Source visual truth | `assets/reference/visual-reference.png` (298 x 318, the supplied kettlebell reference) |
| Implementation | `previews/static/kettlebell-bot-512.png`, rendered from `rive/kettlebell-bot.riv` |
| Motion principles reference | xAI's Grok Bot design write-up — used only for the high-level ideas (expressive eyes, posture, readable agent states, motion as presence). No vectors, poses, timing or visual design were taken from it. |

## Silhouette and palette

The body path, the handle's outer arch and the two pill eyes are the reference
geometry, unchanged. Everything added — the gradients, the front and back
surface fields, the contact shadow, the rim light, the back seam and vents — sits
inside the silhouette and is clipped to it, so the outline the reference
established is exactly the outline the avatar still has.

The handle's negative space was redesigned (four axis-aligned Bézier anchors
instead of five free ones). It reads the same at rest and is what makes the
opening close correctly during the turn. This is the only geometry change to the
reference shapes, and it is a deliberate trade for the turnaround.

Colour stayed a two-value system: charcoal body, off-white eyes. The supporting
depth values are tint and shade steps around the same charcoal, and the one new
hue — the rim light — is `palette.primary` from `riv_design_tokens` at 24%.

## Findings

No P0, P1 or P2 mismatch remains.

- **Fonts and typography** — not applicable; neither the reference nor the asset
  contains text.
- **Spacing and layout** — the character keeps the reference's centred, compact
  proportions. It is scaled to 92% inside the 512 artboard, which is head room for
  jumps, spins and overshoot rather than a proportion change.
- **Colour and tokens** — high-contrast two-value treatment preserved. The asset
  is transparent and uses no background colour. Verified against light `#F4F5F7`
  and dark `#0F1115` surfaces.
- **Asset fidelity** — native Bézier vector artwork, crisp edges, no embedded
  raster, no transparency halo, no masking artefact. `riv_lint`: 0 errors,
  0 warnings.
- **Motion** — see the critique history below.

## Critique history

### Iteration 1 — `previews/critique/pass1-*`

Filmstrips and onion skins for 18 animations.

| Finding | Fix |
|---|---|
| The front face panel read as a graphic — a lighter rounded rectangle with a hard edge sliding across the body | Replaced both panels with soft radial fields that fade to fully transparent at the rim; there is now no edge to give them away |
| The rim light read as a stray scratch: its path bulged outside the silhouette and its round cap left a bright nub on the left | Rebuilt it from the real body outline, truncated with de Casteljau at 70% so it ends on the curve instead of running blunt into the handle junction |
| The contact shadow under the handle left a visible hard arc across the shoulders | Converted to a radial gradient |
| At profile the handle read as a thin needle | Handle plate depth raised from 44 to 72, so the edge-on arch is 30% of its front width — the proportion a real kettlebell handle has |
| The back view was not clearly darker than the front | Back field strengthened, seam shortened, vents widened |
| `mood_05_blocked` was nearly static across the whole filmstrip — it read as a pose, not a state | Rewritten as a strain cycle: push, shudder, give up, slump, gather, try again |
| Gaze darts in `calm`, `curious` and `listening` were too small to read | Amplitudes roughly doubled; `curious` also got eye offsets so the eyes lead the head |
| The working strike lacked punch | Rotation, translation and impact squash raised ~25% |

### Iteration 2 — `previews/critique/pass2-*`

Re-shot the changed animations.

- `blocked` now shows a readable arc across the strip: lean, push, fail, slump,
  gather. Distinct from `focused`, which is deliberately the stillest loop.
- `curious` shows the gaze visibly darting and re-targeting.
- `working` reads as a strike with an absorbed impact.
- `calm` and `listening` keep their restraint while the eye life now registers.
- Confirmed no loop lost its seam: every looping track still starts and ends on
  the same value (enforced at build time, not by eye).

### Iteration 3 — `previews/critique/final-*`

Full-set confirmation pass. No regressions.

### Iteration 4 — film grain

Added a grain texture for surface character. Three passes, because the first two
were wrong in instructive ways.

| Attempt | Result | Fix |
|---|---|---|
| 939 ellipse specks, density 9, 1.5–3.4 px, balanced light/dark | Read as scattered dust, not grain: specks individually distinguishable and too far apart. The dark specks did nothing at all — the body is already at ~13% luminance, so darkening it 8% is invisible | Raised density, shrank the specks, split the alpha ranges so light and dark specks carry different weight, and shifted the mix to 72% light |
| 2300 ellipse specks, density 24 | Read correctly, but the file went 185 KB → 348 KB (+87%) and `riv_optimize` recovered nothing | Switched the primitive |
| 2059 dash specks, density 20, bucketed into 29 shapes | Finer and more grain-like — real grain is directional, not round — and 263 KB. Superseded by iteration 5 | — |

A degenerate two-point path (both points identical) draws nothing in this
runtime, so every dash carries a real length; that was verified with a probe
scene before committing to the approach.

The grain is checked through the full turnaround: it stays clipped to the form,
turns with it, and does not interfere with the handle squash, the opening
closing, the eye wrap or the back detail.

### Iteration 5 — grain that reads as illustration grain

Feedback on iteration 4: the reference is illustration grain, where the
highlights and shadows are themselves made of grain, and what shipped read as
dust scattered over a smooth surface. It was wrong in two independent ways.

**Too sparse.** A density sweep against file size and render cost:

| Density | Specks | File | 256 px frame | Read |
|---|---|---|---|---|
| 20 (shipped in iteration 4) | 2,059 | 263 KB | — | Scattered dust |
| 70 | 7,188 | 461 KB | 3.2 ms | Grain, slightly coarse |
| 140 | 14,432 | 743 KB | 7.3 ms | Grain |
| 300 | 30,950 | 1,383 KB | — | Oversampled; below one device pixel |

There is no perceptual ceiling in reach — grain wants roughly one speck per
device pixel and that is far out of budget — so density is chosen against the
budget. 140 is the compromise. Confirmed first that the format offers no
cheaper primitive: the Rive MCP scene schema has no noise, blend mode, feather
or stroke dash-array, so more geometry is the only lever.

**Uniform, so it flattened the form.** Grain of a single strength over the whole
surface buries the shading. Fixed by scaling speck strength with local surface
luminance, evaluated by `bodyLuma()`/`handleLuma()` from the same gradient
constants the artwork paints. Validated against a real 512 px render over 7,134
points inside the silhouette: r = 0.996, means identical to four decimals.

**A defect found while fixing it.** Measuring mean luminance before and after
showed the grain was brightening the character — +5.0% at delta 0.032, +6.8% at
0.048, +13.1% at 0.068. The hand-tuned 72% light ratio meant the strength dial
was also a brightness dial, so every strength change silently restyled the
character. Replaced with a derived ratio: each direction's achievable deviation
is computed, and light is chosen with probability
`headDark / (headLight + headDark)`, which cancels the expected shift exactly.
The residual is now +1.6% and, more importantly, constant across strength. The
ratio settles at 49/51 on its own.

| Check | Before | After |
|---|---|---|
| Brightness shift at delta 0.048 | +6.8% | +1.6% |
| Shift varies with strength | +5.0% → +13.1% | +1.6% flat |
| Light/dark mix | 72/28, hand-tuned | 49/51, derived |

Re-verified after the change: byte-deterministic rebuild, `riv_lint` 0 errors /
0 warnings, all state-machine passes, 45 previews and 5 contact sheets
regenerated, turnaround re-checked at all seven facings, and the SVG re-imported
through `riv_import_svg` with the grain intact.

One approximation is knowingly left in: the shading model describes the rest
pose, so at back-facing angles the surface is darker than it predicts and the
grain reads marginally stronger. A per-facing scatter would fix it at thirteen
times the file size.

### Iteration 6 — two reported turn bugs

Both came from using the playground, and neither was caught by the existing
suite. They were unrelated to each other.

**1 · The body looked transparent during spins and the shoulder peek.** The back
seam and vents were visible through the front of the character while the eyes
were still showing, and the eyes themselves rendered grey rather than white.

The cause was in the keyframe reducer in `turnTracks()`. It dropped every
interior keyframe whose value matched the previous one — including the last
keyframe of a flat run. That is the shoulder, and losing it turns "hold, then
move" into one long ramp from where the hold began. `TurnBack.opacity` was
reduced to `0:0` then `36:0.6746`, so the back panel began fading up at frame
zero instead of holding at zero until the character had actually turned past
profile. `EyeL/R.opacity` had the same shape, which is why the eyes dimmed.

Fixed by keeping a keyframe when the value is flat on both sides only. Costs 639
keyframes (+5%) and repairs every scripted turn at once:

| Track in `turn_spin_right` | Before | After |
|---|---|---|
| `TurnBack.opacity` | `0:0  36:0.67  39:1 …` | `0:0  33:0  36:0.67  39:1 …` |
| `TurnFront.opacity` | `0:1  33:0.74  36:0 …` | `0:1  30:1  33:0.74  36:0 …` |
| `EyeL.opacity` | `0:1  33:0  54:0 …` | `0:1  30:1  33:0  54:0 …` |

**2 · The 360 tour did nothing.** A one-shot cannot share a state-machine layer
with a level-triggered condition. The Turn layer holds its state with transitions
like `status == 0`, which is true on *every* frame rather than only when status
changes, so firing a turn shot entered the shot state and was then immediately
dragged back to the facing blend. All four shots were affected; the spins and the
peek move far enough in their first half second to look plausible anyway, but the
tour opens on a deliberate 24-frame hold at facing 0 and so was pulled back before
it had moved at all.

Fixed by moving the shots to their own `Turn Shot` layer above `Turn`, idling on
the track-free `neutral` animation — the same shape the Reaction layer already
uses over Mood. Added validator rule 8: any layer sharing channels with an
earlier layer must have a track-free entry state, or it can never yield them
back. Verified the guard fails when deliberately broken.

**The suite let both through, so it was the third thing to fix.** The `turn` pass
asserted only that each shot's animation was *entered*, which a stolen shot still
satisfies, and it sampled 0.45 s into a 7-second tour. A new `shots` pass fires
each shot and samples it at the point where the character should be facing away.

The assertion went through one bad version worth recording. Comparing whole
frames against the front pose separated a working tour from a dead one by just
4.85% against 3.40% — the test would have passed the very bug it was written for,
because a stolen shot still drifts before it is dragged back. Replaced with a
count of eye pixels: the eyes are the only thing brighter than 25% luminance, so
on a black background they isolate exactly, and "the character turned away" is
what the animation actually promises.

| Capture | Fixed | Broken |
|---|---|---|
| `front-baseline` | 469 eye px | 469 |
| `tour-at-back` | 0 | 462 |
| `spin-right-mid` | 0 | 475 |
| `spin-left-mid` | 0 | 466 |
| `peek-at-back` | 0 | 459 |

Two orders of magnitude instead of 1.4×, and it fails all four shots on the
broken build rather than two.

### Iteration 7 — the eyes sat inside the form at profile

Reported from the playground: at 90 degrees the eye reads as floating *inside*
the kettlebell rather than sitting on its outer corner, "like his body is
transparent" in reverse — the eye looked painted on a surface that wasn't there.

Measured before touching anything, and the report was exactly right. At facing
90 the visible eye centre was at |x| = 114.5 while the body's edge at eye height
was 155.3: the eye reached only 74% of the half-width, leaving a 41-unit dark
margin outside it. The cause was a single constant. The eyes rode an invented
"head cylinder" of radius 120 while the bell they are painted on is 163.5 across
at eye height. Nothing tied the two together, so the eye path was a third
smaller than the form it was supposed to be wrapped around.

The fix makes the eyes and the silhouette projections of one solid:

- The bell's plan-view cross-section became an explicit ellipse
  (`BELL_RADIUS_X` by `BELL_RADIUS_X * BELL_DEPTH_RATIO`).
- The eyes are decals on it, with the azimuth *derived* from the requirement
  that the resting pair stay 72 px apart — so the front-facing rest pose is
  reproduced to the digit and no preview shifts.
- The silhouette squeeze became the exact projection of that ellipse,
  `hypot(cos a, 0.95 sin a)`, replacing a linear approximation that disagreed
  with it by about 1% mid-turn.
- Foreshortening now comes from the ellipse normal rather than the eye point's
  own depth. On a circle these are the same number; on a flattened bell the
  point version keeps an eye at full width past the angle where its own patch of
  surface has gone edge-on.

Two things were then wrong that measurement caught and the eye alone would not
have:

**`BELL_RADIUS_X` had to be 151.6, not 163.5** (at the eye sizes of the time —
it is derived from them now; see Iteration 8). Riding the true eye-height radius
put the eye centre on the rim at 90 — correct — but an eye is a rigid shape, and the bell keeps narrowing above eye height. Rendered, the far eye left
the silhouette entirely between 45 and 75 degrees. An eye can only ride the
smallest circle it spans, so the radius is measured at the top of the tallest
eye variant. Worst-case overhang across all angles and all seven variants fell
from 13.6 units to 2.3.

**The clip was hiding the failure rather than fixing it.** `FaceRoot` is now
clipped to `body-mask`, which is what a decal on a surface has to do, and which
also absorbs the ±21 px a hard gaze adds on top of the turn. But with the
radius still at 163.5 the clip was deleting the whole eye at 90 rather than
trimming it, and the state-machine suite stayed green throughout — it only
checks that turned-away shots show *no* eyes, so an eye wrongly clipped to
nothing looks like a pass. Caught by rendering the same sweep with the clip on
and off and diffing the bright-pixel counts.

| facing | eye reaches (% of half-width) | before | after |
|---|---|---|---|
| 45 | | 40% | 46% |
| 60 | | 51% | 66% |
| 75 | | 60% | 81% |
| 90 | | 74% | 90% |

With the clip on, it trims 10% of the eye's pixels at 90 and 2% at 60, and
nothing anywhere else — the overhanging corner, and only that.

The turnaround sheet is regenerated from the same maths, and
`build-svg.mjs` now clips the sheet's eyes to each cell's own squeezed body, so
the static SVG cannot disagree with the rig about where an eye ends.

### Iteration 8 — much bigger eyes

Requested: make the eyes much bigger. They are now `EYE_SCALE` 1.4 — the default
pill goes 24 x 62 to 33.6 x 86.8, very nearly double the area — and the whole
face sits on three dials instead of thirty hand-authored coordinates.

The interesting part is that eye size is not a free parameter here, because the
eyes are decals on the bell. A taller eye reaches higher up the body, where the
bell has already narrowed, which forces `BELL_RADIUS_X` down and pulls the eye
back from the rim at profile — undoing the previous iteration. Rather than
re-measure the radius by hand and risk exactly the staleness this file keeps
recording, `BELL_RADIUS_X` is now derived by the module:

```
BELL_RADIUS_X = bodyHalfWidthAt(EYE_Y - EYE_MAX_HALF.y)
```

so it re-measures itself whenever the eyes are resized. `bodyHalfWidthAt()` had
to move above the eye block for that, which is the only reason `geometry.mjs`
was reordered.

The three dials were then chosen against rule 9 rather than by eye. Sweeping
`EYE_SCALE` x `EYE_Y` x `EYE_SEPARATION` and reading off the two guard metrics:

| scale | eye Y | separation | overhang (max 4) | profile reach (min 85%) |
|---|---|---|---|---|
| 1.3 | -35 | 72 | 3.3 | 86.0% |
| 1.4 | -35 | any | — | fails |
| 1.4 | -24 | 84 | 3.6 | 86.7% |
| 1.5 | -24 | 84 | 4.0 | 85.4% |
| 1.6 | any | any | — | fails |

Three things fall out of that table:

- **Overhang is set almost entirely by `EYE_SCALE`**, barely at all by height or
  separation. It is what caps the size: 1.5 sits exactly on the limit and 1.6 is
  out of reach at any height.
- **Reach is set by height and separation.** At the original eye height of -35
  the ceiling is 1.3 with the pair no wider apart than before — and rendered,
  that reads visibly crowded, because the eyes grow while the gap between them
  does not.
- **Lowering the eyes buys the room back.** The bell is widest near its middle,
  so moving the centre from -35 to -24 raises the usable radius enough to afford
  both 1.4 and a wider pair.

Shipped: `EYE_SCALE` 1.4, `EYE_Y` -24, `EYE_SEPARATION` 84 — margins of 0.4
units of overhang and 1.7 points of reach. The eyes sit 11 px lower than before,
which was not requested and is the one judgement call here: at the old height
the only options were noticeably smaller eyes or a crowded pair.

Checked across the whole system rather than on the front pose alone: all seven
variants keep clear gaps (`previews/sheets/eye-shapes.png`), all 16 moods still
read (`previews/sheets/emotions.png`), profile still puts the eye on the outer
corner, and the `shots` pass measures 910 eye pixels at front against 469 before
— the ~1.96x area increase, confirmed in pixels rather than asserted.

## Two defects the build guards caught

Both were invisible in a single-animation preview and would have shipped:

1. **The handle disappeared in every state-machine render.** Rive writes keyed
   `x`/`y` absolutely; the mood loops were authoring them as deltas, which snapped
   the handle and the face to their parent's origin. Found by bisecting the
   layers, fixed by moving the rest offsets onto `HandleRoot` / `FaceRoot`, and
   locked shut by a validator rule.
2. **The neutral facing disagreed with the static rig by 4%.** Eye foreshortening
   at facing 0 evaluated to 0.96 instead of 1.0. Now asserted: `face_000` must
   reproduce the rig's own static values or the build fails.

## Checklist

- [x] Reference silhouette and two-value palette preserved
- [x] Full 360 turnaround: front, three-quarter, profile, back, opposite profile, front
- [x] Turn built from projection, not a flat global rotation
- [x] Eyes wrap the form, foreshorten and pass behind the limb
- [x] Eyes ride the bell's own cross-section, reaching its outer corner at profile
- [x] Handle opening closes and reopens correctly through the turn
- [x] 16 emotional states legible without labels (`previews/sheets/emotions.png`)
- [x] 10 one-shot reactions with anticipation, overshoot and settle
- [x] Varied blink system: single, double, wink, plus per-mood blink rhythms
- [x] Mobile interaction: hover, press, tap, drag-to-turn, pointer-tracked gaze
- [x] Handle, body, eyes and depth layers behave as one weighted object
- [x] Every looping animation verified seam-free at build time
- [x] Every state-machine input and transition exercised
- [x] Three motion critique passes with filmstrips and onion skins
- [x] Vector-only film grain: no tile, no raster, clipped to the form
- [x] `riv_lint`: 0 errors, 0 warnings

final result: passed
