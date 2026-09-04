# Kettlebell Bot

Kettlebell Bot is an original, minimal Rive avatar for AI and productivity interfaces. The deliverable is a transparent, editable vector character with semantic runtime states, not a raster image embedded in a `.riv` file.

![Kettlebell Bot on a light surface](previews/static/kettlebell-bot-on-light.png)

## Primary deliverables

- `assets/svg/kettlebell-bot.svg` — editable 512×512 SVG source
- `rive/kettlebell-bot.riv` — runtime asset, Rive format 7.0
- `rive/kettlebell-bot.scene.json` — reproducible scene/animation source used by rive-mcp
- `previews/static/` — SVG and Rive renders at 512, 128, 64, 32, and 24 px, plus light/dark surface checks
- `previews/animations/` — transparent APNG previews for every required animation
- `previews/states/` — captured state-machine checkpoints
- `previews/comparisons/` — critique filmstrips, onion skins, and A/B output
- `specs/` — visual, motion, integration, and validation contracts
- `examples/KettlebellBot.tsx` — semantic React wrapper example

The reference PNG is preserved under `assets/reference/` for provenance only. It is not embedded in the SVG or Rive asset.

## Rive contract

- Artboard: `KettlebellBot` (512×512)
- State machine: `KettlebellBotMachine`
- Persistent input: `status` (`0` idle, `1` thinking, `2` working, `3` waiting, `4` blocked)
- One-shot triggers: `acknowledge`, `complete`, `blink`
- Animations: `01_idle` through `09_blink`, plus internal `00_face_neutral`

See `specs/integration-contract.md` for exact behavior and the trigger timing note.

## Environment and MCP setup

Environment observed on 2026-09-04:

- macOS 27.0, Apple silicon (`arm64`)
- Node.js 26.8.1
- npm/npx 11.19.0
- Git 2.50.1 (Apple Git-155)
- Codex CLI 0.149.1
- Google Chrome installed at `/Applications/Google Chrome.app`
- Rive Desktop installed at `/Applications/Rive.app`, version 0.8.5674 (build 5661)

The upstream [rive-mcp repository](https://github.com/ODU33104/rive-mcp) was inspected before installation. Its main branch reported 0.6.0; the documented npm package currently installed is `rive-mcp-server@0.5.0`, which exposes 30 tools including SVG import, creation, editing, inspection, rendering, state-machine playback, linting, critique, A/B comparison, and code generation.

Codex registration performed:

```sh
npm install -g rive-mcp-server
codex mcp add rive -- rive-mcp
```

The original Codex configuration was backed up to:

`~/.codex/config.toml.backup-kettlebell-bot-20260904`

The project-scoped Rive design guidelines were installed by `riv_setup` under `.claude/skills/rive-design-guidelines/`.

## Rebuild and inspect

Run commands from this directory:

```sh
node scripts/rive-mcp-client.mjs call riv_import_svg '{"svgPath":"assets/svg/kettlebell-bot.svg","outSpec":"assets/svg/kettlebell-bot.scene.json","idPrefix":""}'
node scripts/build-rive.mjs
node scripts/render-previews.mjs
node scripts/test-state-machine.mjs
node scripts/start-studio.mjs
node scripts/rive-mcp-client.mjs call riv_inspect '{"path":"rive/kettlebell-bot.riv"}'
node scripts/rive-mcp-client.mjs call riv_lint '{"path":"rive/kettlebell-bot.riv"}'
```

`build-rive.mjs` imports the SVG-derived Bézier fragment, reconstructs the named transform hierarchy, writes the reproducible scene JSON, and creates the final `.riv` through rive-mcp. `render-previews.mjs` exports the animation and small-size checks.

To watch a preview in Chrome:

```sh
open -a "Google Chrome" previews/animations/idle.apng
open -a "Google Chrome" previews/animations/thinking.apng
open -a "Google Chrome" previews/animations/working-32.apng
```

`test-state-machine.mjs` replays all semantic status changes plus blink, done, and acknowledge triggers and refreshes the PNG captures under `previews/states/`.

`start-studio.mjs` keeps the local Rive Studio server alive at `http://localhost:8787/`; leave that process running while you inspect the artboard, timeline, hierarchy, and state-machine controls. Stop it with Ctrl-C.

The asset loads and renders in rive-mcp's official `@rive-app/canvas` runtime. The installed Rive Desktop 0.8.5674 opens the file window but displays a blank canvas; because the same format-7.0 file validates, renders, and runs its state machine in the current official runtime, this is recorded as a local editor-version compatibility limitation rather than an asset/runtime failure. Use a current Rive editor/runtime or the generated scene source for inspection and editing.

## Design notes

The body uses `#1B1D22` and the eyes use `#F8FAFC`. Its updated motion creates 2.5D depth through perspective squash, handle lag, gaze parallax, and asymmetric near/far-eye acting; no shading or extra detail is needed to preserve the clean icon at 24–32 px. The asset itself has no background, outline, filter, raster, text, bones, or unnecessary decoration. On very dark application surfaces, place the avatar on a subtle contrasting container rather than adding a permanent outline to the mascot.
