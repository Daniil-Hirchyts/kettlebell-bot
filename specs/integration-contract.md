# Integration contract

## Runtime identifiers

- File: `rive/kettlebell-bot.riv` (Rive format 7.0, 1,277 KB, no embedded assets)
- Artboard: `KettlebellBot` (512 x 512, transparent)
- State machine: `KettlebellBotMachine` — 36 inputs, 12 layers, 80 states, 127 transitions

Apps drive semantic inputs only. They never need to name an animation or
coordinate timelines: the layers compose on their own.

## Inputs

### Persistent

| Input | Type | Initial | Range | Meaning |
|---|---|---:|---|---|
| `status` | number | `0` | `0`–`19` | Persistent mood (table below) |
| `facing` | number | `0` | `0`–`360` | `0` looks at you · `90` right profile (face toward screen-left) · `180` fully turned away · `270` left profile |
| `gazeX` | number | `0` | `-1`–`1` | Eye direction, left to right |
| `gazeY` | number | `0` | `-1`–`1` | Eye direction, up to down (positive is down) |
| `intensity` | number | `0.5` | `0`–`1` | Ambient liveliness. Scales the idle motion under the mood, it does not change the mood |
| `hover` | bool | `false` | | Lifts and scales the bot toward the viewer |
| `pressed` | bool | `false` | | Holds a squash for as long as it is true |
| `eyes` | number | `0` | `0`–`14` | Optional shape; `0` follows the mood/reaction |
| `effectsIntensity` | number | `1` | `0`–`1` | Particle visibility; `0` hides the complete pool |

`facing`, `gazeX`, `gazeY` and `intensity` are 1D blend states, so they are
continuous and safe to drive from a gesture every frame. `facing` is sampled at
10-degree steps and blended between; anything in `0`–`360` is valid.

### Mood values

| Value | Mood | Value | Mood |
|---:|---|---:|---|
| `0` | calm | `8` | excited |
| `1` | curious | `9` | happy |
| `2` | thinking | `10` | proud |
| `3` | working | `11` | confused |
| `4` | bored | `12` | skeptical |
| `5` | blocked | `13` | nervous |
| `6` | sleepy | `14` | playful |
| `7` | focused | `15` | listening |
| `16` | determined | `18` | recovering |
| `17` | exhausted | `19` | cheeky |

Six of these — curious, thinking, working, bored, confused and playful — also own
a scripted head turn on the Turn layer. While one of them is active, `facing` is
ignored; it takes effect again as soon as the mood changes to any other value.

### Triggers

| Trigger | Length | What it reads as |
|---|---:|---|
| `acknowledge` | 0.55 s | "I saw that" — a weighted nod |
| `surprise` | 0.80 s | Alert / startled |
| `celebrate` | 1.50 s | Task complete — jump, sparkle eyes, landing |
| `frustrated` | 1.00 s | Shakes it off |
| `relieved` | 1.10 s | Long exhale |
| `wobble` | 1.00 s | Knocked off balance and recovering |
| `gearUp` | 0.90 s | Coils and gets ready |
| `laugh` | 1.10 s | Playful giggle |
| `tapped` | 0.50 s | Direct touch feedback |
| `recoil` | 0.90 s | Shoved, recovers |
| `powerUp` | 1.50 s | Compress, rise into a strong held pose, settle |
| `personalBest` | 1.75 s | Victory hop, star eyes, weighted landing |
| `cheer` | 1.25 s | Two encouraging bounces |
| `appreciate` | 1.50 s | Happy arc eyes, a gentle lean and nod |
| `idea` | 1.00 s | Sudden eye opening and attentive lift |
| `dizzy` | 2.00 s | Uneven round-eye lids and a decaying wobble |
| `spinRight` / `spinLeft` | 1.50 s | Full 360 in either direction |
| `turnaround` | 7.00 s | The showcase turn, held at each key facing |
| `peek` | 1.60 s | Looks over its shoulder and back |
| `blink` / `blinkDouble` / `wink` | 0.23–0.50 s | Eye-only, never interrupts the body |
| `fxSparkles` | 1.10 s | Four small rounded sparkles, staggered around the shoulders |
| `fxMotes` | 1.80 s | Six grayscale capsules gently drifting upward |
| `fxSweat` | 1.30 s | One small drop sliding down the visible right shoulder |
| `fxDust` | 0.80 s | Five short dust marks dispersing from the base |

Triggers are fire-and-forget. Reactions, turns and blinks each live on their own
layer and return to whatever is underneath on their own, so there is no cleanup
and no state to reset. Firing a trigger while the same layer is busy restarts it.

## Appearance

The body retains its charcoal material and all fourteen eye glyphs use the original
`#F8FAFC` off-white. The common eye scale is 1.65, up from 1.4. The resting eye
centres are 94 units apart and 10 units above the body centre. The projection
radius follows the enlarged glyph envelope with two units of inset, keeping
turned eyes attached to the body silhouette.

The four new moods and six reactions use the established eye vocabulary.
The original mood/reaction choices remain unchanged. The optional `eyes` values
are: `0 auto`, `1 pill`, `2 tall`, `3 round`, `4 slit`, `5 arc`, `6 wedge`,
`7 star`, `8 soft`, `9 wide`, `10 squint`, `11 crescent`, `12 frown`, `13 droop`,
`14 diamond`. Only the glyph is overridden; lids, gaze, turn and body acting
continue normally. Returning to `0` yields the glyph channels back.

Particles are independent, explicitly triggered, and grayscale. Their emitter
projection follows the Turn/Turn Shot layers, including scripted mood yaw.
The full six-node pool resets on every shot and at its endpoint. A trigger
replaces the current effect with no crossfade, avoiding leftover particles.
Setting `effectsIntensity = 0` hides particles immediately without changing
eyes or body motion. A drop emitted on the far shoulder can be hidden at some
facings; all effects disappear at the full back view. Colored-eye palettes and
the discarded confetti/hearts/orbiting-stars effects are not included.

React exposes `eyes`, `effectsIntensity`, `setEyes()` and all four `fx*` methods.

## Composition rules

- A mood and a reaction compose: `status = working` plus `celebrate` plays the
  celebration over the working body, then hands control back.
- A mood and a facing compose: `status = happy` at `facing = 300` is a happy bot
  seen from behind its left shoulder.
- `hover`, `pressed`, `intensity` and both gaze axes compose with everything.
- The four new moods respect `facing`.
- Any eye selection and particle effect compose with all moods and reactions.
- Particles never fire from a mood, reaction, hover or press automatically.
- The only exclusion is the six scripted-yaw moods above.

## Timing note

Persistent blends are 240–260 ms; reaction and turn entries are 70–90 ms; blinks
are instant. Fire a trigger at least ~100 ms after changing `status` so the mood
crossfade has settled; otherwise the trigger can be consumed before the
destination state's outgoing edge is live. This is ordinary state-machine timing,
not an asset defect.

## Suggested product mapping

| Product moment | Inputs |
|---|---|
| Idle in a list | `status = calm`, `intensity = 0.35` |
| User starts typing | `status = listening` |
| Request sent | `acknowledge`, then `status = thinking` |
| Long job running | `status = working`, `intensity = 0.7` |
| Waiting on the user | `status = bored` |
| Needs permission / is stuck | `status = blocked` |
| Job succeeded | `celebrate`, then `status = happy` |
| Job failed | `frustrated`, then `status = blocked` |
| Recovered from an error | `relieved`, then `status = calm` |
| Avatar tapped | `tapped` (fires automatically in the reference wrapper) |
| Avatar dragged horizontally | map dx to `facing` |
| Pointer moving over the avatar | map position to `gazeX` / `gazeY` |
| App backgrounded / user idle | `status = sleepy`, `intensity = 0` |

## React reference

`examples/KettlebellBot.tsx` wraps all of the above:

```tsx
const bot = useRef<KettlebellBotHandle>(null);

<KettlebellBot ref={bot} mood="working" intensity={0.7} />;

bot.current?.celebrate();
bot.current?.turnaround();
bot.current?.lookAt(-0.6, 0.2);
```

It also wires the mobile interactions: dragging horizontally turns the bot,
a tap under the drag threshold fires `tapped`, pointer position drives the gaze,
and enter/leave drive `hover`.

## Expansion example

```tsx
<KettlebellBot ref={bot} mood="determined" intensity={0.7} />;
bot.current?.personalBest();
```

Existing mood numbers 0–15, existing triggers, artboard and state-machine names
remain unchanged. No iOS application files are changed by this library update.
