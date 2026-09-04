# Avatar specification

## Identity

Kettlebell Bot is a front-facing, calm AI assistant mascot whose integrated handle and weighted body create an immediate kettlebell silhouette. The expression is carried entirely by two vertical eyes and restrained whole-body motion.

## Geometry

- Artboard and SVG viewBox: 512×512
- Visual bounds: approximately x=99–413, y=58–443
- Handle: compound Bézier path with a real transparent inner contour
- Body: broad seven-anchor Bézier silhouette with rounded shoulders and a deliberately flatter lower edge
- Eyes: two independent 24×62 rounded pill paths
- Optical eye centers: x=220 and x=292, y=269
- SVG logical IDs: `kettlebell-bot`, `handle`, `handle-shape`, `body`, `body-shape`, `face`, `eye-left`, `eye-right`

The source uses four filled vector shapes. Rive import produces five closed `PointsPath` contours and 33 cubic vertices. The handle's second contour is the negative-space opening.

## Rive hierarchy

```text
KettlebellBotRoot
└── CharacterTransform
    ├── Handle
    │   └── handle-shape
    ├── Body
    │   └── body-shape
    └── FaceTransform
        ├── EyeLeft
        │   └── eye-left
        └── EyeRight
            └── eye-right
```

`CharacterTransform` pivots at the visual mass center (256, 304), allowing translation, rotation, and compensated X/Y scaling without separating the handle. Each eye has its own centered transform for blink and expression work.

## Color and background

- Body and handle: `#1B1D22`
- Eyes: `#F8FAFC`
- Asset background: transparent

The restrained two-fill palette is intentional. No gradient was added because the product brief prioritizes tiny-size clarity and rejects unnecessary shading. For near-black host surfaces, use a subtle container such as a light neutral tile or a slightly elevated dark surface.

## Small-size acceptance

Static renders exist at 512, 128, 64, 32, and 24 px. At 24–32 px:

- the handle opening remains distinct;
- the eyes remain separated;
- the lower silhouette stays broad and stable;
- there are no outline or filter artifacts;
- the avatar continues to read as a compact kettlebell rather than a padlock or headphones.

