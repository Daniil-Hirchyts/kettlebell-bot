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
- [x] Handle opening closes and reopens correctly through the turn
- [x] 16 emotional states legible without labels (`previews/sheets/emotions.png`)
- [x] 10 one-shot reactions with anticipation, overshoot and settle
- [x] Varied blink system: single, double, wink, plus per-mood blink rhythms
- [x] Mobile interaction: hover, press, tap, drag-to-turn, pointer-tracked gaze
- [x] Handle, body, eyes and depth layers behave as one weighted object
- [x] Every looping animation verified seam-free at build time
- [x] Every state-machine input and transition exercised
- [x] Three motion critique passes with filmstrips and onion skins
- [x] `riv_lint`: 0 errors, 0 warnings

final result: passed
