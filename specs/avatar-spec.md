# Avatar specification

## Identity

Kettlebell Bot is a charcoal kettlebell that behaves like a small, opinionated
creature. Its silhouette comes straight from the supplied reference — an arched
handle over a broad, rounded bell — and everything expressive is layered on top
of that shape rather than beside it. The eyes carry the acting; the body carries
the weight.

The character is not a front-facing icon. It is rigged to turn a full 360
degrees, and every emotional state is authored to compose with whatever facing
it happens to be in.

## Geometry

- Artboard and SVG viewBox: 512 x 512, `KettlebellBot`
- Character origin: artboard (256, 302), uniformly scaled 0.92 to leave head room
  for jumps, spins and overshoot
- Body: seven-anchor Bézier blob, half-width 157, top -137.5, bottom +137.5,
  taken verbatim from the reference artwork
- Handle: compound path — a five-anchor outer arch plus a real negative-space
  opening, centred 169.5 above the body centre
- Handle opening: redesigned to four axis-aligned Bézier anchors. Every tangent
  is horizontal or vertical, which makes squashing the arch on the X axis an
  exact four-track operation instead of a twenty-track approximation. This is
  what lets the opening close correctly as the bot turns to profile.
- Eyes: 24 x 62 rounded pills, centres 72 px apart at rest, 35 px above the body
  centre

### Depth layers

All of these are clipped to an invisible copy of the body silhouette, so they can
swing freely across the form without ever leaving it.

| Layer | Role |
|---|---|
| `body-core` | Vertical gradient — the base form |
| `body-mask` | Invisible silhouette, clip source for every layer below |
| `body-topshade` | Radial contact shadow where the handle meets the bell |
| `face-plate` | Soft radial light field marking the front surface; slides and squashes with facing |
| `back-plate` | Soft radial dark field marking the back surface |
| `back-seam`, `back-vent-a`, `back-vent-b` | Crisp back-of-device detail, only visible when turned away |
| `body-rim` | Stroked run of the real body outline, clipped to a crescent — a fixed key light from the upper left |

## Rive hierarchy

Rive writes keyed `x`/`y` absolutely, so every node an animation translates sits
at its parent's origin, and rest offsets live on dedicated parent nodes
(`HandleRoot`, `FaceRoot`). `scripts/lib/validate.mjs` enforces this.

```text
Root                        (256, 302, scale 0.92)
└── Energy                  intensity blend
    └── Touch               hover / press
        └── Char            mood body acting
            └── Yaw         turn-system lean, lift and squash
                ├── BodyPivot
                │   └── BodyPlate
                │       ├── body-core · body-mask · body-topshade · body-rim
                │       ├── TurnFront → face-plate
                │       └── TurnBack  → back-plate · back-seam · back-vent-a/b
                ├── HandleRoot
                │   └── HandlePivot
                │       └── HandlePlate → handle-shape
                └── FaceRoot
                    └── Face
                        └── GazeX
                            └── GazeY
                                ├── EyeL → EyeLBlink → EyeLSolo → 7 eye shapes
                                └── EyeR → EyeRBlink → EyeRSolo → 7 eye shapes
```

Each eye is three nested transforms plus a Solo group, so the turn system, the
blink layer and the mood layer can all act on the same eye without fighting:
`EyeL` is foreshortening, `EyeLBlink` is lids, `EyeLSolo` is expression and shape.

## Eye shape variants

The eyes are the main expressive feature, so they are not one shape that scales.
Each eye is a Rive `Solo` group holding seven variants; a mood or reaction swaps
the active child instantly, then acts on it with scale, rotation and offset.

| Variant | Geometry | Used by |
|---|---|---|
| `pill` | 24 x 62 rounded bar (the reference shape) | calm, thinking, nervous, acknowledge |
| `tall` | 28 x 76 rounded bar | working, excited |
| `round` | 42 px circle | curious, listening, surprise, wobble, tapped |
| `slit` | 34 x 12 rounded bar | bored, sleepy, skeptical |
| `arc` | Upward crescent | happy, proud, playful, relieved, laugh |
| `wedge` | Angled-top pill, mirrored per side | focused, blocked, frustrated, gear-up |
| `star` | Four-point sparkle | celebrate |

Asymmetric pairs are allowed and used deliberately: `confused` runs `round` +
`slit` and swaps them mid-loop; `skeptical` holds `slit` + `pill`.

## Colour

Brand colours are locked to the reference. The supporting depth values are
tint/shade steps around the same charcoal, and the rim light uses `palette.primary`
from `riv_design_tokens` (seed `#1B1D22`, mood `tech`, scheme `dark`).

| Token | Value | Use |
|---|---|---|
| body gradient | `#22252C` → `#15171B` | Bell |
| handle gradient | `#252932` → `#171A20` | Arch |
| front field | white → transparent, 12% peak | Front surface light |
| back field | `#05070B` → transparent, 69% peak | Back surface |
| back detail | `#2E323C` | Seam and vents |
| contact shadow | `#0C0E12` → transparent, 72% peak | Under the handle |
| rim light | `#9C9EA5` at 24% | Upper-left edge |
| eyes | `#F8FAFC` | Both eyes, all variants |

The asset itself has no background. On very dark surfaces, place it on a slightly
elevated container rather than adding a permanent outline.

## Deliberate constraints

- No raster artwork, no embedded images, no third-party mascot assets. The `.riv`
  contains 0 image assets and 24 vector shapes.
- The turnaround is a projection model, not a flat rotation: the handle's
  projected width, the closing of its opening, and the eyes' travel around the
  head cylinder are each computed from the facing angle.
- Small-size legibility was explicitly deprioritised per the brief. The asset is
  tuned for 96–256 px mobile avatar use; below ~48 px the depth layers stop
  contributing and the silhouette carries the read on its own.
