# Kettlebell Bot

A vector Rive avatar for mobile apps. It is a charcoal kettlebell that turns a
full 360 degrees, holds twenty distinct emotional states, and reacts, blinks,
looks around and responds to touch — all composable, all driven by one state
machine.

![Kettlebell Bot on a light surface](previews/static/kettlebell-bot-on-light.png)

| | |
|---|---|
| Turnaround, every 30 degrees | ![](previews/sheets/turnaround.png) |
| All 20 emotional states | ![](previews/sheets/emotions.png) |

Animated: [`previews/animations/showcase_turnaround.gif`](previews/animations/showcase_turnaround.gif) ·
[`previews/animations/showcase_emotions.gif`](previews/animations/showcase_emotions.gif)

## What is in the box

- `rive/kettlebell-bot.riv` — the runtime asset. Rive format 7.0, 1,277 KB,
  transparent, no embedded images.
- `rive/kettlebell-bot.scene.json` — the full reproducible scene the `.riv` is
  built from.
- `assets/svg/kettlebell-bot.svg` — the editable vector source, layered and named
  to match the Rive rig.
- `assets/svg/kettlebell-bot-expressions.svg` — all 14 editable eye glyphs.
- `assets/svg/kettlebell-bot-particles.svg` — four small monochrome particle glyphs.
- `assets/svg/kettlebell-bot-turnaround.svg` — seven facings drawn by the same
  projection model the `.riv` animates.
- `assets/icon/` — app-icon artwork: the bot in a held three-quarter pose,
  looking up and past the viewer, cropped for the icon frame on a transparent
  1024 canvas (SVG, with PNG renders). `npm run build:icon` regenerates the SVGs;
  it projects the same solid the rig describes, with pitch as well as yaw.
- `examples/KettlebellBot.tsx` — React wrapper with drag-to-turn, tap, hover and
  pointer-tracked gaze.
- `specs/` — avatar, animation, integration and validation specifications.
- `previews/` — an animated preview per animation, contact sheets, state-machine
  captures and critique filmstrips.

## The rig, briefly

A flat rotation cannot sell a turn for this character, so the yaw is a small
projection model rather than a set of drawn poses. One angle drives everything:

- **The handle is a plate with real thickness.** It is drawn as its exact
  projection: the near face, a copy of the outline at the far face, and the band
  between their tops, which is the plate's depth times `|sin a|` wide. A turn
  uncovers a band of side wall and the inner wall of the opening, and at true
  profile the handle is a flat-topped post — the side of the plate. You see
  through the opening only where the two faces' openings overlap: a lens that
  narrows, flattens and closes to a point by 63 degrees.
- **One key light, above and to the left.** The bell is a body of revolution, so
  its lighting does not turn with it: a key lift, a falloff, a soft directional
  rim and a bounce sit on the bell, squeeze with the silhouette and never slide.
  The handle's face and walls are each lit by how squarely they face that light,
  so as the bot turns one catches it while the other drops into shadow.
- **The eyes are decals on the bell.** They ride the bell's own cross-section —
  an ellipse slightly flatter front-to-back than it is wide — so they wrap around
  the real form, foreshorten, stall at the limb and pass out of sight, then
  reappear from the other side. At true profile an eye sits on the outer corner
  of the silhouette, where a decal on that surface has to be, and the body's
  silhouette squeeze is the exact projection of the same ellipse.
- **A front light field and a back dark field counter-slide** across the bell,
  giving it a near surface and a far one. Turned away, a seam and two vents make
  the back readable as a back.
- **The grain is 18,543 vector specks**, not a texture — no tile, so nothing
  repeats. Placed on a jittered grid, drawn as tiny stroked dashes, parented
  inside the form so it turns with it. Each speck is sized by the luminance
  deviation it should produce rather than by an alpha, and the light/dark mix is
  derived so the grain is mean-preserving — turning it up cannot brighten the
  character. Strength follows the shading, so the highlight and the contact
  shadow are themselves grainy instead of being covered in uniform noise. Two
  dials in `GRAIN` (`scripts/lib/geometry.mjs`); see `specs/avatar-spec.md`.

The held facings, the scripted head turns and the full spins are the same maths
sampled differently, so they can never disagree.

The state machine has twelve layers: Energy, Touch, Turn, Turn Shot, Mood,
Reaction, Eyes, Effects Intensity, Effects, Gaze X, Gaze Y and Blink. That is what lets a mood, a facing, a gaze
direction, a blink and a press all play at once instead of overriding one
another — and it is checked at build time, so a violation fails the build rather
than producing a subtly wrong file.

Most layers own their channels outright. Reaction overrides Mood, Turn Shot
overrides Turn, and Eyes can temporarily select a glyph over Mood/Reaction.
A one-shot cannot live on the same layer
as a level-triggered condition like `status == 0`, which is true on every frame
and will drag the machine straight back out of the one-shot. An overriding layer
must idle on a track-free animation so it can hand the channels back; that is
checked at build time too.

## Using it

```tsx
import { KettlebellBot, type KettlebellBotHandle } from "./KettlebellBot";

const bot = useRef<KettlebellBotHandle>(null);

<KettlebellBot ref={bot} mood="working" intensity={0.7} />;

bot.current?.celebrate();   // finished
bot.current?.turnaround();  // full 360
bot.current?.lookAt(-0.6, 0.2);
bot.current?.setEyes("crescent");
bot.current?.fxMotes();      // independent particle-only shot
bot.current?.setEyes("auto"); // return to mood/reaction eye choices
```

Inputs: `status` (0–19), `facing` (0–360), `gazeX`/`gazeY` (-1–1),
`intensity` (0–1), `hover`, `pressed`, `eyes` (0–14),
`effectsIntensity` (0–1), and 27 triggers. Full table in
[`specs/integration-contract.md`](specs/integration-contract.md).

## More personality, the original visual language

Four new moods — **determined**, **exhausted**, **recovering**, **cheeky** — join
six new reactions: `powerUp`, `personalBest`, `cheer`, `appreciate`, `idea`, `dizzy`.
They use the original seven eye shapes, with personality carried by posture,
gaze, lid timing and delayed handle movement. Appreciate smiles and nods;
dizzy uses uneven lids and a wobble that gradually settles.

All eyes are off-white. The eyes are about 18% wider/taller than the previous
1.4-scale rig (39% more area), and the turn projection is recalibrated for their
size and spacing. Seven optional eye shapes extend the same rounded vocabulary:
**soft**, **wide**, **squint**, **crescent**, **frown**, **droop**, **diamond**.
Choose a shape independently or keep Automatic to preserve the current mood
and reaction acting. Eyes remain off-white.

Four restrained particle shots — `fxSparkles`, `fxMotes`, `fxSweat`, `fxDust` —
use grayscale capsules, rounded sparkles and a small drop. There are at most six
particles. Their emitters follow the bell's yaw projection, hide behind the
back, and use the narrower base radius for dust. They never start automatically;
a new effect replaces the previous one and resets the whole pool.

```tsx
<KettlebellBot ref={bot} mood="determined" intensity={0.7} />;
bot.current?.powerUp();
bot.current?.fxSparkles();
```

The playground includes every expression, turn, gaze and blink control, all four
preview sizes (44/64/160/512 px), and light/dark surfaces. Review sheets live in
`previews/sheets/expansion-{light,dark}-{44,64,160,512}.png`.

## Building

Everything is generated from `scripts/lib/geometry.mjs` — the SVG source and the
Rive scene are built from the same numbers, so they cannot drift apart.

```sh
npm run build      # SVG + .riv (validates first, refuses to write on error)
npm run check      # validate and write the scene JSON only, no MCP round trip
npm run verify     # is the committed .riv still what the source produces?
npm run test       # drive every state-machine input and transition
npm run previews   # one animated preview per animation, plus static renders
npm run review     # expression samples at 44/64/160/512 on light/dark
npm run sheets     # contact sheets for turnaround, emotions, reactions, touch
npm run critique   # filmstrips, onion skins and contact sheets; tag it: npm run critique -- pass3
npm run lint:riv   # riv_lint
npm run studio     # local Rive Studio at http://localhost:8787
npm run all        # build, test, previews, sheets
```

## Interaction playground

The Vite + React playground in [`playground/`](playground/) gives the avatar a
live control surface for all of its Rive inputs. From the project root, run:

```sh
npm run playground
```

Drag the avatar to turn it, move across it to steer its gaze, tap it for touch
feedback, and use the controls to test moods, energy, facial direction, turns,
reactions, and blinks. The current `.riv` asset is synchronized automatically
before every playground run.

If you open the asset in Rive Studio or any editor that can save back to
`rive/kettlebell-bot.{riv,scene.json}`, run `npm run verify` afterwards. The
build is byte-deterministic, so it can tell you exactly which shape or property
drifted — an editor round-trip can quietly add things the source never had, such
as a default fill on a stroke-only path.

Source layout:

```text
scripts/lib/geometry.mjs    artwork: paths, eye variants, palette, depth layers
scripts/lib/turn.mjs        the yaw projection model and its track generator
scripts/lib/motion.mjs      channel helpers, easing tokens, volume compensation
scripts/lib/moods.mjs       the 20 persistent mood loops
scripts/lib/reactions.mjs   the 16 one-shots and the 3 blinks
scripts/lib/expressions.mjs optional eye-only poses
scripts/lib/effects.mjs     grayscale particles, surface projection and resets
scripts/lib/turnanims.mjs   facing poses, head turns, spins, gaze, energy, touch
scripts/lib/showcase.mjs    preview-only reels, sampled from the real animations
scripts/lib/scene.mjs       rig, artwork and state-machine assembly
scripts/lib/validate.mjs    the build-time guards
scripts/verify-asset.mjs    drift check: committed asset vs. a clean rebuild
scripts/lib/png.mjs         dependency-free PNG reader/writer for contact sheets
scripts/lib/svg.mjs         geometry to SVG path data
```

## Environment

- macOS 27.0 (Apple silicon), Node 26.8.1, npm 11.19.0
- `rive-mcp-server@0.5.0`, registered as the `rive` MCP server:

```sh
npm install -g rive-mcp-server
```

The design guidelines the build follows are installed at
`.claude/skills/rive-design-guidelines/`.

Rive Desktop 0.8.5674 opens the file but shows a blank canvas; the same
format-7.0 file validates and runs its state machine in the current official
runtime. Use a current Rive editor, `npm run studio`, or the scene JSON to
inspect. See [`specs/validation-report.md`](specs/validation-report.md).

## Credits and constraints

Original artwork. The silhouette derives from the supplied kettlebell reference
(kept in `assets/reference/` for provenance only — it is never embedded). Motion
principles — expressive eyes, posture, readable agent states, motion as presence —
were informed by xAI's published Grok Bot design process; no vectors, poses,
timing or visual design were taken from it.
