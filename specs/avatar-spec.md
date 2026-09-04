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
| `BodyGrain`, `HandleGrain` | Film grain — see below |

### Film grain

The grain is not a texture. Embedded raster is out of scope for this project, and
a tiled noise image would repeat, so the grain is 2059 individually placed vector
specks — 1568 on the bell, 491 on the handle. There is no tile, therefore no
pattern to notice.

- **Placement** is a jittered grid, not uniform random. Random sampling clumps,
  and clumps read as dirt rather than grain; stratifying and then jittering
  inside each cell gives even coverage with no visible structure. Seeds are
  fixed, so the build stays byte-deterministic.
- **Each speck is a very short stroked dash**, not a dot. Real grain is irregular
  and slightly directional, and a dash costs one object less than an ellipse
  (a path plus two vertices, rather than a shape, an ellipse, a fill and a
  colour). A zero-length path draws nothing in this runtime, so every dash has a
  real length.
- **Specks are grouped into 29 shapes**, bucketed by colour, thickness and
  opacity, since those three are per-shape in Rive. Position and length stay
  per-speck, and those carry the variation the eye actually registers.
- **Mostly light specks** (72%). The body sits at roughly 13% luminance, so a
  black speck at 8% alpha moves it about 1% and is invisible, while a white one
  at the same alpha reads clearly. The dark specks therefore carry two to three
  times the alpha of the light ones.
- **It is material, not an overlay.** The grain is parented inside the body and
  handle and clipped to them, so it turns, squashes and travels with the form
  rather than sitting in screen space.
- **The eyes stay clean.** Grain sits above the form shading and below the eyes,
  because the eyes are the whole expression and they read better crisp.

Density is one number per region in `GRAIN` (`scripts/lib/geometry.mjs`), in
specks per 1000 square px: roughly 12 is a whisper, 20 is the shipped default,
32 is pronounced. It scales file size close to linearly, which is why it is a
single dial.

The grain is tuned for the avatar's intended display size of roughly 96–256 px,
where it reads as a fine tooth on the surface. Zoomed far past that the specks
become individually visible, which is inherent to vector grain: a speck has a
fixed size in artboard units, so there is no setting that is simultaneously
correct at 96 px and at 2000 px.

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
| grain, light | `#FFFFFF` at 3–7.5% | 72% of specks |
| grain, dark | `#05070B` at 10–22% | 28% of specks |
| eyes | `#F8FAFC` | Both eyes, all variants |

The asset itself has no background. On very dark surfaces, place it on a slightly
elevated container rather than adding a permanent outline.

## Deliberate constraints

- No raster artwork, no embedded images, no third-party mascot assets. The `.riv`
  contains 0 image assets; the grain that would normally be a noise texture is
  2059 real vector specks.
- The turnaround is a projection model, not a flat rotation: the handle's
  projected width, the closing of its opening, and the eyes' travel around the
  head cylinder are each computed from the facing angle.
- Small-size legibility was explicitly deprioritised per the brief. The asset is
  tuned for 96–256 px mobile avatar use; below ~48 px the depth layers stop
  contributing and the silhouette carries the read on its own.
