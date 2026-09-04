# Integration contract

## Runtime identifiers

- File: `kettlebell-bot.riv`
- Artboard: `KettlebellBot`
- State machine: `KettlebellBotMachine`

Applications should drive semantic inputs only. They do not need to start or coordinate individual timelines.

## Inputs

### `status` — number, initial `0`

| Value | Semantic state | Rive behavior |
|---:|---|---|
| `0` | Idle | `01_idle` |
| `1` | Thinking | `03_thinking` |
| `2` | Working | `04_working` |
| `3` | Waiting | `05_waiting` |
| `4` | Blocked | `06_blocked_enter` once, then `07_blocked_idle` |

The numeric contract prevents contradictory simultaneous states.

### `acknowledge` — trigger

Plays `02_acknowledge`, then returns to the current `status`.

### `complete` — trigger

Plays `08_done`, then returns to the current `status`. If completion should settle permanently to Idle, set `status=0` before or immediately after firing `complete`.

### `blink` — trigger

Plays `09_blink` on the independent face layer without interrupting semantic body motion.

## Timing note

Fire one-shot triggers after the current crossfade has settled. Persistent-state blends are at most 90 ms; one-shot return blends are at most 100 ms. A trigger fired during an in-progress transition can be consumed before the destination state's outgoing edge is active, which is normal state-machine timing behavior. A 100 ms debounce after changing `status` is sufficient.

## Expected flows

```text
Idle → Thinking → Working → Waiting
Working → BlockedEnter → BlockedIdle → Working
Any stable state → Done → current status
Any stable state → Acknowledge → current status
Any semantic state + Blink Layer → same semantic state
```

All flows above were exercised with `riv_play_state_machine`; representative captures are under `previews/states/`.

## React reference

See `examples/KettlebellBot.tsx` for a wrapper that supports:

```tsx
<KettlebellBot state="thinking" />
```

and exposes `acknowledge()`, `complete()`, and `blink()` through a ref.

