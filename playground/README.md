# Kettlebell Bot Playground

A local Vite + React control surface for the Kettlebell Bot Rive avatar.

Run from this directory:

```sh
npm ci
npm run dev
```

The app automatically copies the latest `../rive/kettlebell-bot.riv` into its
public assets before development and production builds. Rebuild the avatar with
`npm run build` from the project root, then refresh the playground to test the
new asset.

The playground exposes mood, facing, gaze, intensity, hover, pressed state,
reactions, spins, turns, and blinks. Drag the avatar horizontally to turn it;
moving across it changes its gaze; tapping it fires the touch reaction.
