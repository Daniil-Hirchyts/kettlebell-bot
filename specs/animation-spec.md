# Animation specification

All animations run at 60 fps internally. Transform keyframes use cubic or hold interpolation. Whole-character deformation is centered on `CharacterTransform`, while small counter-motions on `Handle`, `Body`, `FaceTransform`, and each eye create a shallow 3D turn without breaking the single-piece kettlebell silhouette.

| Animation | Duration | Loop | Motion language |
|---|---:|---|---|
| `01_idle` | 4.80 s | yes | Slow weight transfer with handle lag and two offset, asymmetric glances |
| `02_acknowledge` | 0.50 s | no | Weighted nod with anticipation, handle follow-through, eye contact, and clean settle |
| `03_thinking` | 2.40 s | yes | Face orbit across a shallow turn; near and far eyes exchange width and tilt |
| `04_working` | 1.40 s | yes | Four-beat orbital loop with body compression, counter-rotating handle, and gaze parallax |
| `05_waiting` | 3.60 s | yes | Low-energy lean, uneven eyelids, and a delayed glance back toward the task |
| `06_blocked_enter` | 0.50 s | no | Decaying recoil with rotational overshoot, handle lag, and asymmetric squint |
| `07_blocked_idle` | 3.60 s | yes | Uneasy side-to-side weight transfer with deliberately uneven eyes |
| `08_done` | 0.80 s | no | Anticipation, lift, brief quarter-turn illusion, handle rebound, weighted landing |
| `09_blink` | 0.167 s | no | Vertical close with slight width expansion to preserve pill-eye weight |
| `00_face_neutral` | 0.017 s | yes | Internal no-track state for the independent blink layer |

## State machine architecture

`KettlebellBotMachine` has two layers:

1. `Semantic State` owns persistent body behavior and one-shot acknowledge/done responses.
2. `Blink Layer` overlays `09_blink` without changing the semantic status.

Persistent statuses have explicit direct transitions, avoiding contradictory booleans and accidental unconditional loops. Blocked entry is sequenced once: any non-blocked persistent state with `status=4` enters `06_blocked_enter`, then proceeds to `07_blocked_idle`. Leaving blocked uses the current numeric status.

`acknowledge` and `complete` have explicit edges from each stable semantic state. Each one-shot returns through Idle and immediately resolves to the still-current `status`, so Working → Done → Working and Thinking → Acknowledge → Thinking are deterministic.

## Critique history

- V1 critique: the shape quality and silhouette were strong, but thinking/working state differences were too subtle at small sizes. Thinking gaze and working pulse were increased within the brief's restraint limits; blocked/done eye mass compensation was refined.
- V2 critique: motion read clearly, but the neutral eye spacing felt too wide and generic. Eye centers were tightened from 84 px to 72 px separation in both SVG source and rig.
- Motion revision: replaced bounce-dominant acting with coordinated form turns, eye parallax, and secondary handle motion. This follows the useful “presence as interface” principle from xAI's Grok Bot process while retaining an original kettlebell silhouette and motion system.
- Final verification is refreshed after every rebuild through runtime inspection, semantic state-machine playback, small-size renders, linting, and visual filmstrip critique.

The eye-height tracks use explicit companion X-scale or positional tracks. Blink closes vertically and expands slightly in X; horizontal shrinking is never used as a substitute for eyelid motion.
