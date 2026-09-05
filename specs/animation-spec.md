# Animation specification

Everything runs at 60 fps. The system has 67 animations, 1282 tracks and 12943
keyframes, driven by one state machine with nine layers.

## The idea

A flat rotation cannot sell a turn for this character, so the yaw is a small
projection model (`scripts/lib/turn.mjs`) rather than a set of hand-drawn poses.
One angle drives everything:

1. **The handle is a flat plate.** Its projected width is `|cos a| + (depth/width) * |sin a|`,
   and its opening closes faster than the outer silhouette because the near arm
   occludes the far one: `hole = (holeWidth * |cos a| - depth * |sin a|) / (holeWidth * handleScaleX)`.
   The opening is gone by 64 degrees while the outer arch is still 70% wide, and
   the arch bottoms out at 30% of its width at true profile — which is what a
   real handle of that thickness does.
2. **The eyes are decals on the bell itself.** Seen from above the bell is an
   ellipse `BELL_RADIUS_X` across by `BELL_RADIUS_X * 0.95` deep, and the eyes
   sit on it at ±16.35 degrees, so they wrap around the real form, foreshorten,
   stall at the limb and pass out of sight. The silhouette squeeze is the exact
   projection of that same ellipse, `hypot(cos a, 0.95 * sin a)`, which is what
   keeps an eye pinned to the rim at every angle rather than only at 0 and 90.
   Foreshortening comes from the ellipse *normal*, not from the eye's own depth:
   on a circle the two agree, on a flattened bell they do not, and the point
   version holds an eye at full width past the angle where its patch of surface
   has already turned edge-on. Foreshortening is normalised so facing 0 lands on
   exactly 1.0, and the resting pair stays exactly `EYE_SEPARATION` apart.

   `BELL_RADIUS_X` is 149.2, which is *not* the body's half-width at eye height
   (165.4). An eye is a rigid shape, up to 106 tall at `EYE_SCALE` 1.4, and the
   bell keeps narrowing above eye height, so an eye riding the eye-height circle
   swings clear off the outline between about 45 and 75 degrees while its centre
   is still well inside. An eye can only ride the smallest circle it spans, so
   the radius is `bodyHalfWidthAt(EYE_Y - EYE_MAX_HALF.y)` — derived by the
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
| Turn | `Yaw.*`, `BodyPlate.scaleX`, `HandlePlate.scaleX`, the four hole vertex tracks, `TurnFront.*`, `TurnBack.*`, `EyeL/R` `x` `scaleX` `opacity` | `facing` (1D blend), `status` |
| Turn Shot | the Turn channels, temporarily | `spinRight`, `spinLeft`, `turnaround`, `peek` |
| Mood | `Char.*`, `BodyPivot.*`, `HandlePivot.*`, `Face.*`, `EyeL/RSolo.*` | `status` |
| Reaction | the Mood channels, temporarily | reaction triggers |
| Gaze X | `GazeX.*` | `gazeX` (1D blend) |
| Gaze Y | `GazeY.*` | `gazeY` (1D blend) |
| Blink | `EyeL/RBlink.*` | `blink`, `blinkDouble`, `wink` |

### The two override pairs

Two layers deliberately share channels with the layer below: Reaction over Mood,
and Turn Shot over Turn. The later layer wins while it is playing and then hands
the channels back.

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
| `showcase_emotions` | 10.93 s | loop | Preview-only: every mood's signature pose, sampled from the real loops, with a head turn per beat. |

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
