# Animation specification

Everything runs at 60 fps. The system has 122 animations, 4403 tracks and 34692
keyframes, driven by one state machine with twelve layers.

## The idea

A flat rotation cannot sell a turn for this character, so the yaw is a small
projection model (`scripts/lib/turn.mjs`) rather than a set of hand-drawn poses.
One angle drives everything:

1. **The handle is a plate with real depth, drawn as its exact projection.** A
   plate projects to the union of its near face, its far face and the band
   between their tops — exactly, for an outline that is convex and symmetric —
   so those are its three pieces: `HandleFace` at `x = -(depth/2) * sin a`
   (mirrored once the back face is the nearer one), `WallFar` opposite it, both
   scaled by `|cos a|`, and `HandleBridge`, `depth * |sin a|` wide. At rest the
   face covers the rest exactly; turned, a band of wall shows beside it, and at
   true profile the band is the whole handle — a flat-topped post, the side of
   the plate.

   You see through the plate only where the two faces' openings overlap. For
   two ellipses set apart, that overlap is a lens `f` as wide and
   `sqrt(f (2 - f))` as tall, with
   `f = 1 - (depth/2 * |sin a|) / (holeHalfWidth * |cos a|)`; it is gone by 63
   degrees. The window is one clip cut from all three pieces, keyed by eight
   vertex tracks, and it closes to a point.

   An earlier version squeezed the whole plate instead. That was at most 2 units
   too wide but up to 11.5 too narrow near profile, so the face stuck out above
   it; fading the face near profile then showed the gap as a ghost, and the
   window closed to a zero-width sliver that the renderer still drew as a
   hairline. Now the face stays opaque — it is part of the silhouette — and
   only its lighting and edge fade over the last ~17 degrees before profile,
   where a sliver's lit edge otherwise reads as a stray bright nick.
2. **The eyes are decals on the bell itself.** Seen from above the bell is an
   ellipse `BELL_RADIUS_X` across by `BELL_RADIUS_X * 0.95` deep, and the eyes
   sit on it at the azimuth derived from eye spacing, so they wrap around the real form, foreshorten,
   stall at the limb and pass out of sight. The silhouette squeeze is the exact
   projection of that same ellipse, `hypot(cos a, 0.95 * sin a)`, which is what
   keeps an eye pinned to the rim at every angle rather than only at 0 and 90.
   Foreshortening comes from the ellipse *normal*, not from the eye's own depth:
   on a circle the two agree, on a flattened bell they do not, and the point
   version holds an eye at full width past the angle where its patch of surface
   has already turned edge-on. Foreshortening is normalised so facing 0 lands on
   exactly 1.0, and the resting pair stays exactly `EYE_SEPARATION` apart. Near
   the limb its small readability floor goes away, so an eye thins to nothing
   rather than fading while it still has width — a half-transparent eye read
   as a grey ghost beside the white one.

   `BELL_RADIUS_X` is approximately 149.5, which is *not* the body's half-width at eye height
   (approximately 167). An eye is a rigid shape, up to 125.4 tall at `EYE_SCALE` 1.65, and the
   bell keeps narrowing above eye height, so an eye riding the eye-height circle
   swings clear off the outline between about 45 and 75 degrees while its centre
   is still well inside. An eye can only ride the smallest circle it spans, so
   the radius is `bodyHalfWidthAt(EYE_Y - EYE_MAX_HALF.y) - 2` — derived by the
   module from the eye shapes themselves, not hand-measured, so resizing the
   eyes cannot silently invalidate it. `FaceRoot` is additionally clipped to
   `body-mask`, which absorbs the last ~4 px of corner overhang on the tallest
   eye variants and the ±21 px a hard gaze adds on top of the turn.

   Eye size is one dial, `EYE_SCALE`, and it is not free. A larger eye reaches
   higher up a narrower part of the bell, which lowers `BELL_RADIUS_X` and pulls
   the eye back from the rim at profile; a wider `EYE_SEPARATION` costs azimuth,
   which does the same. Validator rule 9 holds both floors, so the dials can be
   turned confidently: the build fails rather than quietly regressing the
   profile pose that rule exists to protect.
3. **A front light field and a back dark field counter-slide** across the bell at
   ±118 px, giving it a readable near and far surface.
4. **One key light.** `KEY_LIGHT` (`scripts/lib/geometry.mjs`) sits above, left
   and in front. The bell is a body of revolution, so its shading does not turn
   with it: the key lift, falloff, rim and bounce fields sit on `BodyPlate`
   outside the turning panels, squeeze with the silhouette and never slide —
   which is what keeps them apart from item 3, whose fields are surface markings
   and must. The handle is flat, so a turn does relight it: the face and the
   wall band each carry a shade and a lift tint whose opacities come from the
   Lambert term of that surface's normal against the light, measured relative to
   the face at rest so the front view is exactly the static artwork. Square-on,
   the wall in view swaps sides; the two walls' values are cross-faded over the
   zero-width band there, so every loop through 0 or 180 stays seamless.

The held facing poses, the scripted head turns and the full spins are all the
same maths sampled differently, so they can never disagree with each other.

## Layer ownership

Layers own their (object, property) channels. This is what lets a mood, a facing,
a gaze direction, a blink and a touch response all play at once without
overriding one another, and it is checked at build time by
`scripts/lib/validate.mjs` — a violation fails the build.

| Layer | Owns | Driven by |
|---|---|---|
| Energy | `Energy.*` | `intensity` (1D blend) |
| Touch | `Touch.*` | `hover`, `pressed` |
| Turn | `Yaw.*`, `BodyPlate.scaleX`, `HandleFace` `x` `scaleX`, `HandleFaceDetail.opacity`, `WallFar` and `WallFarEdge` `x` `scaleX`, `HandleBridge.scaleX`, the six handle light tints' `opacity`, the eight window vertex tracks, `TurnFront.*`, `TurnBack.*`, `EyeL/R` `x` `scaleX` `opacity`, `FxProjection*` `x` `scaleX` `opacity`, `FxGlyph*.scaleX` | `facing` (1D blend), `status` |
| Turn Shot | the Turn channels, temporarily | `spinRight`, `spinLeft`, `turnaround`, `peek` |
| Mood | `Char.*`, `BodyPivot.*`, `HandlePivot.*`, `Face.*`, `EyeL/RSolo.*` | `status` |
| Reaction | the Mood channels, temporarily | reaction triggers |
| Eyes | `EyeL/RSolo.soloActive`, optionally overriding mood/reaction | `eyes` (0 = automatic) |
| Effects Intensity | `FxIntensity.opacity` | `effectsIntensity` (1D blend) |
| Effects | `FxEmitter*.scaleX`, `FxParticle*` transforms/opacity and `FxGlyph*.soloActive` | four `fx*` triggers |
| Gaze X | `GazeX.*` | `gazeX` (1D blend) |
| Gaze Y | `GazeY.*` | `gazeY` (1D blend) |
| Blink | `EyeL/RBlink.*` | `blink`, `blinkDouble`, `wink` |

### Override layers

Two layers deliberately share channels with the layer below: Reaction over Mood,
and Turn Shot over Turn. Eyes also overrides the shape channels when explicitly
selected, yielding to both Mood and Reaction in automatic mode. The later layer
wins while active and then hands the channels back.

**A one-shot cannot share a layer with a level-triggered condition.** That is the
rule these pairs exist to satisfy, and it is not obvious until it bites. The Turn
layer holds its state through transitions like `status == 0`, which is true on
*every frame*, not just at the moment status changes. When the turn shots lived
on that layer, firing one entered the shot state and the still-true `status == 0`
transition immediately fired again and dragged the machine back to the facing
blend. The spins survived it because their first half-second moves a long way, so
they looked roughly right; the 360 tour opens on a deliberate 24-frame hold at
facing 0 and so was pulled back before it had moved at all, and looked completely
dead.

The half of the bargain that makes an override layer safe is that it must be able
to *yield*: its entry state runs an animation with no tracks at all
(`neutral`), so when nothing is playing the layer below shows through untouched.
Give it anything else and it pins those channels forever. Validator rule 8
enforces this on every layer that shares channels with an earlier one.

## Craft rules applied throughout

- **Anticipation before every action.** Reactions and the working strike all move
  10–15% against the coming motion first.
- **Nothing lands on its target.** Actions overshoot 5–15% and settle.
- **The handle is never in phase with the body.** It lags 2–4 frames on entry and
  settles later, in every loop and every one-shot.
- **Ambient tracks never peak together.** `y`, `rotation` and `scaleY` peaks are
  offset by 20–40% of the cycle.
- **Volume is conserved.** Where an author moved one scale axis and left the other
  flat, `withVolume()` derives the companion axis, bounded so a full eyelid close
  widens the eye a little rather than ballooning it.
- **No transform track is linear.** Timing tokens come from `riv_design_tokens`:
  tap 6f, exit 15f, enter 27f, emphasis 30f, ambient 3.5s; enter decelerates,
  exit accelerates.

## Animation index

### Mood layer — persistent states

| Animation | Length | Loop | Motion language |
|---|---:|---|---|
| `mood_00_calm` | 5.20 s | loop | Slow weight transfer, two unhurried glances, one soft blink and one double blink. The restrained baseline everything else is measured against. |
| `mood_01_curious` | 3.60 s | loop | Leans in, darts the gaze to a new target before the body follows, holds, re-targets. Head turns come from `yaw_curious`. |
| `mood_02_thinking` | 3.20 s | loop | Drifts up and away, stalls, then catches an idea: eyes pop from `pill` to `round` on a snap and the body rises with it. |
| `mood_03_working` | 1.40 s | loop | A hammering motif: wind up, strike, absorb the impact with a squash, reset. The handle whips through the strike and keeps swinging after the body stops. |
| `mood_04_bored` | 4.20 s | loop | Slumped weight held off-centre, heavy half-lids, one long reluctant sigh and one slow full blink per cycle. |
| `mood_05_blocked` | 3.00 s | loop | Pushes against whatever is stopping it, shudders under the strain, gives up, slumps, gathers itself and tries again. |
| `mood_06_sleepy` | 5.40 s | loop | Nods off, jolts awake, sinks again. Lids sink to a slit, snap fully open on the jolt, then droop. |
| `mood_07_focused` | 2.40 s | loop | The stillest loop in the set. Focus reads as an absence of motion next to everything around it: one deliberate blink, no wandering. |
| `mood_08_excited` | 1.20 s | loop | Three hops of unequal height with anticipation crouches and squash-and-stretch landings. |
| `mood_09_happy` | 2.00 s | loop | Buoyant two-beat rocking, arc eyes, the handle swinging behind the body like a tail. |
| `mood_10_proud` | 3.00 s | loop | Chest out, held high, unhurried. Body scales up on Y, handle carried above its rest position. |
| `mood_11_confused` | 2.80 s | loop | Hesitant stop-start head tilts with mismatched eyes — `round` and `slit` — that swap sides mid-loop. |
| `mood_12_skeptical` | 2.60 s | loop | Weight pulled back and to one side, one lid low, one brow raised, a slow sideways appraisal. |
| `mood_13_nervous` | 1.80 s | loop | A fast repeating tremor — a fixed four-frame pattern, never random noise — under a shallow, quick breath. |
| `mood_14_playful` | 1.60 s | loop | A skipping rhythm with a hitch in it: two big lateral hops, a wink on the beat between them. |
| `mood_15_listening` | 3.00 s | loop | Leans in, tracks side to side, gives small acknowledging nods and blinks on the beat. |
| `mood_16_determined` | 3.50 s | loop | Wedge eyes, deliberate bracing, a held forward lean, one focused blink. |
| `mood_17_exhausted` | 4.20 s | loop | Rounded slit eyes, two unequal effortful breaths, prolonged blink, slumped handle. |
| `mood_18_recovering` | 5.00 s | loop | Closed slit eyes, slow inhale and exhale with a held breath, gradually straightens. |
| `mood_19_cheeky` | 3.50 s | loop | Uneven pill lids; eyes glance before the lean, a held wink, opposite glance. |

### Reaction layer — one-shots

| Animation | Length | Loop | Motion language |
|---|---:|---|---|
| `react_acknowledge` | 0.55 s | one-shot | Weighted nod: anticipation up, sharp nod down, overshoot, settle. The eyes squint at the bottom of the nod. |
| `react_surprise` | 0.80 s | one-shot | Hard recoil back and up, eyes blow open to `round`, two decaying settle bounces. |
| `react_celebrate` | 1.50 s | one-shot | Crouch, launch 52 px, `star` eyes at the apex with a rotation flourish, landing squash, two rebound hops. |
| `react_frustrated` | 1.00 s | one-shot | Three decaying shakes on `wedge` eyes, then a heavy exhale that drops and flattens the body. |
| `react_relieved` | 1.10 s | one-shot | Inhale and rise, hold, long exhale that sinks and widens, arc eyes, slow return. |
| `react_wobble` | 1.00 s | one-shot | Knocked off balance: a decaying rotational teeter with the handle overshooting on every swing. |
| `react_gearup` | 0.90 s | one-shot | Coil, hold the coil, snap into a ready stance. `wedge` eyes narrow through the crouch. |
| `react_laugh` | 1.10 s | one-shot | Four decaying giggle bounces with the rotation alternating and arc eyes squeezing on each beat. |
| `react_tapped` | 0.50 s | one-shot | Direct touch feedback: immediate squash, snap back with overshoot, one small wobble. |
| `react_recoil` | 0.90 s | one-shot | Shoved sideways with rotation, gathers itself, eyes go `round` then `wedge` before recovering. |
| `react_powerup` | 1.50 s | one-shot | Compress, hold anticipation, rise into a strong stance, settle. |
| `react_personalbest` | 1.75 s | one-shot | Victory hop, star eyes, weighty landing and one rebound. |
| `react_cheer` | 1.25 s | one-shot | Two unequal encouraging bounces with arc eyes. |
| `react_appreciate` | 1.50 s | one-shot | Happy arc eyes, gentle lean, weighted nod and staggered lid response. |
| `react_idea` | 1.00 s | one-shot | Brief squint, sudden round eyes, attentive lift. |
| `react_dizzy` | 2.00 s | one-shot | Uneven round-eye lids, drifting gaze and a decaying wobble. |

### Turn layer — scripted head turns and spins

| Animation | Length | Loop | Motion language |
|---|---:|---|---|
| `turn_spin_right` | 1.50 s | one-shot | Full 360 to the right: anticipation against the turn, fast pass through both profiles and the back, overshoot past front, settle. |
| `turn_spin_left` | 1.50 s | one-shot | Mirror of the above. |
| `turn_showcase_360` | 7.00 s | one-shot | The required turnaround, held at each key facing long enough to read: front, three-quarter, profile, back, opposite profile, opposite three-quarter, front. |
| `turn_peek_back` | 1.60 s | one-shot | Looks over its shoulder to about 150 degrees, holds, snaps back with an overshoot. |
| `yaw_curious` | 3.60 s | loop | Scans left, holds, snaps right, holds, drifts back. |
| `yaw_thinking` | 3.20 s | loop | Drifts away to a three-quarter, stalls, snaps forward on the idea beat. |
| `yaw_working` | 1.40 s | loop | Short yaw oscillation locked to the hammer rhythm. |
| `yaw_bored` | 4.20 s | loop | Holds a 42-degree look away for most of the cycle. |
| `yaw_confused` | 2.80 s | loop | Two sharp opposite head turns with a `ease-out-back` overshoot on each. |
| `yaw_playful` | 1.60 s | loop | Wide, fast swings to both sides with a lift on each. |

### Gaze, energy, touch, blink and showcase

| Animation | Length | Loop | Motion language |
|---|---:|---|---|
| `blink_single` | 0.23 s | one-shot | Close, brief hold, overshoot open. The two eyes are one frame out of phase. |
| `blink_double` | 0.50 s | one-shot | Two beats, the second lighter. |
| `blink_wink` | 0.45 s | one-shot | One lid drops slowly and dips while the other eye widens — asymmetric in both timing and amplitude. |
| `touch_hover` | 2.00 s | loop | Lifts toward the viewer and scales up 4%, with a slow bob. |
| `touch_press` | 0.20 s | one-shot | Squash held at the end of the clip, released when `pressed` goes false. |
| `energy_low` | 2.80 s | loop | Ambient loop at 0.35x amplitude. |
| `energy_mid` | 2.80 s | loop | Ambient loop at 1x amplitude. |
| `energy_high` | 2.80 s | loop | Ambient loop at 2.1x amplitude, with y, rotation and scale peaks deliberately out of phase. |
| `showcase_turnaround` | 5.60 s | loop | Preview-only: the turnaround with the body kept breathing underneath. |
| `showcase_emotions` | 13.67 s | loop | Preview-only: every mood's signature pose, sampled from the real loops, with a head turn per beat. |

## Build-time guards

`scripts/build-rive.mjs` refuses to write the `.riv` if any of these fail:

1. A layer keys a channel it does not own.
2. A looping track does not return to its starting value, or runs past its duration.
3. Keyframe frames are not strictly increasing.
4. A solo reference or track target does not exist.
5. A delta-authored layer translates a node that carries a rest offset — the bug
   class that silently teleports the handle to the body centre.
6. `face_000` does not reproduce the rig's own static values.
7. An open path carries a fill, which would join its endpoints and flood the chord.

An eighth check warns (does not fail) when a transform track has no easing.
`npm run verify` separately confirms the committed `.riv` still matches the source.

## Expression refinement

All moods and reactions use the original seven Solo glyphs. The common eye scale
is 1.65 (previously 1.4); the resting centres move to y = -10 and 94 units apart.
The projection radius is derived from the tallest eye with a two-unit inset.
Validator rule 9 still checks the entire 360-degree path; the tolerance and
minimum profile reach are unchanged.

New reactions fill the complete body/expression channel contract before volume
compensation so interruption cannot inherit a previous shot's transforms.
Colored-eye palettes and the earlier particle implementation remain removed.
Color-track syntax validation remains available as a general scene guard.

## Optional eyes and small particle effects

Fourteen `eyes_<shape>` poses select the Solo glyphs. All seven additions fit
inside the established maximum eye bounds, so the accepted projection, scale,
spacing and mood/reaction tracks do not change.

| Particle animation | Duration | Visible particles |
|---|---:|---:|
| `fx_sparkles` | 66 frames / 1.10 s | 4 |
| `fx_motes` | 108 frames / 1.80 s | 6 |
| `fx_sweat` | 78 frames / 1.30 s | 1 |
| `fx_dust` | 48 frames / 0.80 s | 5 |

The hierarchy is `BodyPivot → FxIntensity → FxEmitter → FxProjection →
FxParticle → FxGlyph`. Turn/Turn Shot own each projection's x, scaleX and
opacity plus each glyph's inverse tangent-width compensation. A front emitter at azimuth p projects to
`160 sin(p) cos(a) - 152 cos(p) sin(a)`. Tangent-plane motion foreshortens by
`cos(p-a) / cos(p)`, and the emitter hides as its normal turns away. Glyph width is compensated so
a drop or sparkle keeps its shape while its flight follows the plane. Dust uses
0.58 of that radius to follow the narrower base; glyph width is compensated.

Effects own only emitter radius, particle-local transforms, opacity and glyph.
They stagger emissions, pop into view, drift in short arcs and fade away. Every
animation keys the entire six-slot pool at frame zero and restores every channel
at the last frame; idle also restores the complete pool. Intensity owns a parent
opacity and never competes with the particle fades. Validation rejects partial
resets, visible endpoints, duplicate tracks and layer ownership violations.
