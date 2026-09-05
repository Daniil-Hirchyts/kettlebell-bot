# Integration contract

## Runtime identifiers

- File: `rive/kettlebell-bot.riv` (Rive format 7.0, 181 KB, no embedded assets)
- Artboard: `KettlebellBot` (512 x 512, transparent)
- State machine: `KettlebellBotMachine` — 24 inputs, 9 layers, 49 states, 81 transitions

Apps drive semantic inputs only. They never need to name an animation or
coordinate timelines: the layers compose on their own.

## Inputs

### Persistent

| Input | Type | Initial | Range | Meaning |
|---|---|---:|---|---|
| `status` | number | `0` | `0`–`15` | Persistent mood (table below) |
| `facing` | number | `0` | `0`–`360` | `0` looks at you · `90` right profile (face toward screen-left) · `180` fully turned away · `270` left profile |
| `gazeX` | number | `0` | `-1`–`1` | Eye direction, left to right |
| `gazeY` | number | `0` | `-1`–`1` | Eye direction, up to down (positive is down) |
| `intensity` | number | `0.5` | `0`–`1` | Ambient liveliness. Scales the idle motion under the mood, it does not change the mood |
| `hover` | bool | `false` | | Lifts and scales the bot toward the viewer |
| `pressed` | bool | `false` | | Holds a squash for as long as it is true |

`facing`, `gazeX`, `gazeY` and `intensity` are 1D blend states, so they are
continuous and safe to drive from a gesture every frame. `facing` is sampled at
30-degree steps and blended between; anything in `0`–`360` is valid.

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
| `spinRight` / `spinLeft` | 1.50 s | Full 360 in either direction |
| `turnaround` | 7.00 s | The showcase turn, held at each key facing |
| `peek` | 1.60 s | Looks over its shoulder and back |
| `blink` / `blinkDouble` / `wink` | 0.23–0.50 s | Eye-only, never interrupts the body |

Triggers are fire-and-forget. Reactions, turns and blinks each live on their own
layer and return to whatever is underneath on their own, so there is no cleanup
and no state to reset. Firing a trigger while the same layer is busy restarts it.

## Composition rules

- A mood and a reaction compose: `status = working` plus `celebrate` plays the
  celebration over the working body, then hands control back.
- A mood and a facing compose: `status = happy` at `facing = 300` is a happy bot
  seen from behind its left shoulder.
- `hover`, `pressed`, `intensity` and both gaze axes compose with everything.
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
