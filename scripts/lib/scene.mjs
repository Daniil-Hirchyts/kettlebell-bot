// Kettlebell Bot — scene assembly: rig hierarchy, artwork, animations, machine.

import {
  ARTBOARD,
  BODY_POINTS,
  COLOR,
  DEPTH_SHAPES,
  EYE_DEFAULT_VARIANT,
  FIELD,
  EYE_VARIANTS,
  EYE_Y,
  GRAIN,
  bodyLuma,
  handleLuma,
  HANDLE_CY,
  HANDLE_HOLE,
  HANDLE_OUTER,
  RIM_POINTS,
  ROOT_SCALE,
  ROOT_X,
  ROOT_Y,
  eyeShapeSpec,
} from "./geometry.mjs";
import { VOLUME_TARGETS, loopAnim, withVolume } from "./motion.mjs";
import { buildMoods } from "./moods.mjs";
import { buildBlinks, buildReactions } from "./reactions.mjs";
import {
  buildEnergyPoses,
  buildFacingPoses,
  buildGazePoses,
  buildTouchAnims,
  buildTurnShots,
  buildYawLoops,
} from "./turnanims.mjs";
import { buildEmotionShowcase, buildTurnShowcase } from "./showcase.mjs";
import { turnPose } from "./turn.mjs";
import { bucketSpecks, scatterGrain } from "./grain.mjs";

const REST = turnPose(0);

// ---------------------------------------------------------------------------
// Rig
// ---------------------------------------------------------------------------
export function buildGroups() {
  const eyeChain = (side) => {
    const sign = side === "L" ? -1 : 1;
    return [
      { id: `Eye${side}`, parent: "GazeY", x: REST[`Eye${side}|x`] ?? sign * 36, y: 0, scaleX: 1, opacity: 1 },
      { id: `Eye${side}Blink`, parent: `Eye${side}`, x: 0, y: 0 },
      {
        id: `Eye${side}Solo`,
        parent: `Eye${side}Blink`,
        x: 0,
        y: 0,
        solo: true,
        active: `eye${side}_${EYE_DEFAULT_VARIANT}`,
      },
    ];
  };

  return [
    { id: "Root", x: ROOT_X, y: ROOT_Y, scaleX: ROOT_SCALE, scaleY: ROOT_SCALE },
    { id: "Energy", parent: "Root", x: 0, y: 0 },
    { id: "Touch", parent: "Energy", x: 0, y: 0 },
    { id: "Char", parent: "Touch", x: 0, y: 0 },
    { id: "Yaw", parent: "Char", x: 0, y: 0 },

    { id: "BodyPivot", parent: "Yaw", x: 0, y: 0 },
    { id: "BodyPlate", parent: "BodyPivot", x: 0, y: 0 },
    { id: "TurnFront", parent: "BodyPlate", x: 0, y: 0, opacity: 1 },
    { id: "TurnBack", parent: "BodyPlate", x: 0, y: 0, opacity: 0 },
    { id: "BodyGrain", parent: "BodyPlate", x: 0, y: 0, clipBy: "body-mask" },

    // Rest offsets live on their own nodes: keyed x/y in Rive is absolute, so
    // any node an animation translates has to sit at the origin of its parent.
    { id: "HandleRoot", parent: "Yaw", x: 0, y: HANDLE_CY },
    { id: "HandlePivot", parent: "HandleRoot", x: 0, y: 0 },
    { id: "HandlePlate", parent: "HandlePivot", x: 0, y: 0 },
    { id: "HandleGrain", parent: "HandlePlate", x: 0, y: 0, clipBy: "handle-shape" },

    // The eyes are painted on the bell, so the bell's silhouette bounds them.
    // Without this clip they visibly leave the outline twice: near profile,
    // where an eye rides the rim at eye height but the body has already
    // narrowed above it, and under a hard gaze, which pushes an eye 21 further
    // out than the turn put it. Clipping is also what lets the eye radius stay
    // honest -- the alternative is shrinking the eye path until nothing can
    // ever poke out, which is what used to strand the eyes inside the form.
    { id: "FaceRoot", parent: "Yaw", x: 0, y: EYE_Y, clipBy: "body-mask" },
    { id: "Face", parent: "FaceRoot", x: 0, y: 0 },
    { id: "GazeX", parent: "Face", x: 0, y: 0 },
    { id: "GazeY", parent: "GazeX", x: 0, y: 0 },
    ...eyeChain("L"),
    ...eyeChain("R"),
  ];
}

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------
export function buildShapes() {
  const shapes = [
    // The handle sits behind the bell, exactly as in the reference silhouette.
    {
      id: "handle-shape",
      type: "polygon",
      parent: "HandlePlate",
      x: 0,
      y: 0,
      z: 0,
      subpaths: [
        { closed: true, points: HANDLE_OUTER },
        { closed: true, points: HANDLE_HOLE },
      ],
      fill: {
        gradient: {
          type: "linear",
          start: { x: 0, y: -78 },
          end: { x: 0, y: 78 },
          stops: [{ color: COLOR.handleTop }, { color: COLOR.handleBottom }],
        },
      },
    },
    {
      id: "body-core",
      type: "polygon",
      parent: "BodyPlate",
      x: 0,
      y: 0,
      z: 10,
      closed: true,
      points: BODY_POINTS,
      fill: {
        gradient: {
          type: "linear",
          start: { x: 0, y: -140 },
          end: { x: 0, y: 140 },
          stops: [{ color: COLOR.bodyTop }, { color: COLOR.bodyBottom }],
        },
      },
    },
    // Invisible silhouette used as the clip source for every depth layer, so
    // panels and shading can swing freely without ever leaving the body.
    {
      id: "body-mask",
      type: "polygon",
      parent: "BodyPlate",
      x: 0,
      y: 0,
      z: 11,
      closed: true,
      points: BODY_POINTS,
      fill: { color: COLOR.invisible },
    },
    {
      id: "body-topshade",
      type: "ellipse",
      parent: "BodyPlate",
      x: DEPTH_SHAPES.topShade.x,
      y: DEPTH_SHAPES.topShade.y,
      z: 12,
      width: DEPTH_SHAPES.topShade.width,
      height: DEPTH_SHAPES.topShade.height,
      clipBy: "body-mask",
      fill: {
        gradient: {
          type: "radial",
          start: { x: 0, y: 6 },
          end: { x: 0, y: 74 },
          stops: FIELD.topShade,
        },
      },
    },
    {
      id: "face-plate",
      type: "ellipse",
      parent: "TurnFront",
      x: DEPTH_SHAPES.facePlate.x,
      y: DEPTH_SHAPES.facePlate.y,
      z: 13,
      width: DEPTH_SHAPES.facePlate.width,
      height: DEPTH_SHAPES.facePlate.height,
      clipBy: "body-mask",
      fill: {
        gradient: {
          type: "radial",
          start: { x: 0, y: -14 },
          end: { x: 0, y: 112 },
          stops: FIELD.front,
        },
      },
    },
    {
      id: "back-plate",
      type: "ellipse",
      parent: "TurnBack",
      x: DEPTH_SHAPES.backPlate.x,
      y: DEPTH_SHAPES.backPlate.y,
      z: 14,
      width: DEPTH_SHAPES.backPlate.width,
      height: DEPTH_SHAPES.backPlate.height,
      clipBy: "body-mask",
      fill: {
        gradient: {
          type: "radial",
          start: { x: 0, y: -6 },
          end: { x: 0, y: 118 },
          stops: FIELD.back,
        },
      },
    },
    {
      id: "back-seam",
      type: "rect",
      parent: "TurnBack",
      x: DEPTH_SHAPES.backSeam.x,
      y: DEPTH_SHAPES.backSeam.y,
      z: 15,
      width: DEPTH_SHAPES.backSeam.width,
      height: DEPTH_SHAPES.backSeam.height,
      cornerRadius: DEPTH_SHAPES.backSeam.cornerRadius,
      opacity: 0.85,
      clipBy: "body-mask",
      fill: { color: COLOR.backDetail },
    },
    {
      id: "back-vent-a",
      type: "rect",
      parent: "TurnBack",
      x: DEPTH_SHAPES.backVentA.x,
      y: DEPTH_SHAPES.backVentA.y,
      z: 16,
      width: DEPTH_SHAPES.backVentA.width,
      height: DEPTH_SHAPES.backVentA.height,
      cornerRadius: DEPTH_SHAPES.backVentA.cornerRadius,
      opacity: 0.72,
      clipBy: "body-mask",
      fill: { color: COLOR.backDetail },
    },
    {
      id: "back-vent-b",
      type: "rect",
      parent: "TurnBack",
      x: DEPTH_SHAPES.backVentB.x,
      y: DEPTH_SHAPES.backVentB.y,
      z: 17,
      width: DEPTH_SHAPES.backVentB.width,
      height: DEPTH_SHAPES.backVentB.height,
      cornerRadius: DEPTH_SHAPES.backVentB.cornerRadius,
      opacity: 0.5,
      clipBy: "body-mask",
      fill: { color: COLOR.backDetail },
    },
    // Fixed key light from the upper left; it anchors the lighting so the
    // rotating panels read as form rather than as graphics sliding around.
    {
      id: "body-rim",
      type: "polygon",
      parent: "BodyPlate",
      x: 0,
      y: 0,
      z: 18,
      closed: false,
      points: RIM_POINTS,
      opacity: 0.24,
      clipBy: "body-mask",
      stroke: { color: COLOR.rim, thickness: 15, cap: "round", join: "round" },
    },
  ];

  // Grain sits above the body's form shading but below the eyes, and on the
  // handle it sits behind the bell so the overlap stays correct. Specks are
  // grouped into a handful of stroked shapes rather than one shape each.
  const grainShapes = (specks, parent, baseZ) =>
    bucketSpecks(specks).map((bucket, index) => ({
      id: `${parent}-${index}`,
      type: "polygon",
      parent,
      x: 0,
      y: 0,
      z: baseZ,
      closed: false,
      subpaths: bucket.subpaths,
      opacity: bucket.opacity,
      stroke: {
        color: bucket.light ? COLOR.grainLight : COLOR.grainDark,
        thickness: bucket.thickness,
        cap: "round",
        join: "round",
      },
    }));

  shapes.push(
    ...grainShapes(scatterGrain({ include: [BODY_POINTS], luma: bodyLuma, ...GRAIN.body }), "BodyGrain", 20),
    ...grainShapes(
      scatterGrain({ include: [HANDLE_OUTER], exclude: [HANDLE_HOLE], luma: handleLuma, ...GRAIN.handle }),
      "HandleGrain",
      5,
    ),
  );

  for (const side of ["L", "R"]) {
    EYE_VARIANTS.forEach((variant, index) => {
      shapes.push(
        eyeShapeSpec(
          variant,
          `eye${side}_${variant.key}`,
          `Eye${side}Solo`,
          side,
          (side === "L" ? 30 : 40) + index,
        ),
      );
    });
  }
  return shapes;
}

// ---------------------------------------------------------------------------
// Animations + state machine
// ---------------------------------------------------------------------------
const NEUTRAL = loopAnim("neutral", 1, []);

// Frames chosen to catch each mood at its most legible instant.
const SHOWCASE_BEATS = [
  ["mood_01_curious", 20, -26],
  ["mood_08_excited", 12, 0],
  ["mood_09_happy", 30, 18],
  ["mood_10_proud", 90, 0],
  ["mood_07_focused", 40, 0],
  ["mood_11_confused", 30, -28],
  ["mood_12_skeptical", 60, 22],
  ["mood_04_bored", 60, 34],
  ["mood_06_sleepy", 110, 12],
  ["mood_13_nervous", 20, -14],
  ["mood_02_thinking", 90, -24],
  ["mood_05_blocked", 32, 0],
  ["mood_14_playful", 20, 30],
  ["mood_03_working", 23, 16],
  ["mood_15_listening", 80, -18],
  ["mood_00_calm", 0, 0],
];

export function buildScene() {
  const moods = buildMoods();
  const reactions = buildReactions();
  for (const item of [...moods, ...reactions]) withVolume(item.anim, VOLUME_TARGETS);
  const blinks = buildBlinks();
  const facingPoses = buildFacingPoses();
  const yawLoops = buildYawLoops();
  const turnShots = buildTurnShots();
  const gaze = buildGazePoses();
  const energy = buildEnergyPoses();
  const touch = buildTouchAnims();

  const byName = new Map(moods.map((m) => [m.anim.name, m.anim]));
  const showcaseEmotions = buildEmotionShowcase(
    SHOWCASE_BEATS.map(([name, frame, facing]) => ({ anim: byName.get(name), frame, facing })),
  );
  const showcaseTurn = buildTurnShowcase();

  const animations = [
    NEUTRAL,
    ...moods.map((m) => m.anim),
    ...reactions.map((r) => r.anim),
    ...blinks.map((b) => b.anim),
    ...facingPoses.map((p) => p.anim),
    ...yawLoops.map((y) => y.anim),
    ...turnShots.map((t) => t.anim),
    ...gaze.x.map((g) => g.anim),
    ...gaze.y.map((g) => g.anim),
    ...energy.map((e) => e.anim),
    touch.rest,
    touch.hover,
    touch.press,
    showcaseTurn,
    showcaseEmotions,
  ];

  const yawStatuses = new Set(yawLoops.map((y) => y.status));
  const facingStatuses = moods.map((m) => m.status).filter((s) => !yawStatuses.has(s));

  const stateMachine = {
    name: "KettlebellBotMachine",
    inputs: [
      { name: "status", type: "number", initial: 0 },
      { name: "facing", type: "number", initial: 0 },
      { name: "gazeX", type: "number", initial: 0 },
      { name: "gazeY", type: "number", initial: 0 },
      { name: "intensity", type: "number", initial: 0.5 },
      { name: "hover", type: "bool", initial: false },
      { name: "pressed", type: "bool", initial: false },
      ...reactions.map((r) => ({ name: r.trigger, type: "trigger" })),
      ...turnShots.map((t) => ({ name: t.trigger, type: "trigger" })),
      ...blinks.map((b) => ({ name: b.trigger, type: "trigger" })),
    ],
    layers: [
      {
        name: "Energy",
        states: [
          {
            name: "EnergyBlend",
            blend1d: { input: "intensity", animations: energy.map((e) => ({ animation: e.anim.name, value: e.value })) },
          },
        ],
        transitions: [{ from: "entry", to: "EnergyBlend", durationMs: 0 }],
      },
      {
        name: "Touch",
        states: [
          { name: "TouchRest", animation: touch.rest.name },
          { name: "TouchHover", animation: touch.hover.name },
          { name: "TouchPress", animation: touch.press.name },
        ],
        transitions: [
          { from: "entry", to: "TouchRest", durationMs: 0 },
          { from: "TouchRest", to: "TouchHover", durationMs: 160, condition: { input: "hover", op: "==", value: true } },
          { from: "TouchHover", to: "TouchRest", durationMs: 200, condition: { input: "hover", op: "!=", value: true } },
          { from: "TouchRest", to: "TouchPress", durationMs: 70, condition: { input: "pressed", op: "==", value: true } },
          { from: "TouchHover", to: "TouchPress", durationMs: 70, condition: { input: "pressed", op: "==", value: true } },
          { from: "TouchPress", to: "TouchHover", durationMs: 180, condition: { input: "hover", op: "==", value: true } },
          { from: "TouchPress", to: "TouchRest", durationMs: 200, condition: { input: "pressed", op: "!=", value: true } },
        ],
      },
      // Held facing and the scripted mood turns. Everything here is driven by a
      // level-triggered `status`/`facing` condition, so the layer holds whatever
      // the app last asked for.
      {
        name: "Turn",
        states: [
          {
            name: "FacingBlend",
            blend1d: { input: "facing", animations: facingPoses.map((p) => ({ animation: p.anim.name, value: p.deg })) },
          },
          ...yawLoops.map((y) => ({ name: y.state, animation: y.anim.name })),
        ],
        transitions: [
          { from: "entry", to: "FacingBlend", durationMs: 0 },
          ...yawLoops.map((y) => ({
            from: "any",
            to: y.state,
            durationMs: 260,
            condition: { input: "status", op: "==", value: y.status },
          })),
          ...facingStatuses.map((status) => ({
            from: "any",
            to: "FacingBlend",
            durationMs: 260,
            condition: { input: "status", op: "==", value: status },
          })),
        ],
      },
      // The triggered turn shots ride on their own layer, above the one that
      // holds the facing, for the same reason reactions ride above moods: a
      // one-shot cannot share a layer with a level-triggered condition. The
      // `status == n` transitions above are true on every frame, so from a shot
      // state they immediately fired again and dragged the machine back to
      // FacingBlend. The spins survived it because their first half-second moves
      // a lot, but the 360 tour opens on a deliberate 24-frame hold at facing 0,
      // so it was pulled back before it had moved at all and looked completely
      // dead. Here the only way in is a trigger, and the idle state keys nothing,
      // so the facing layer below shows through whenever no shot is playing.
      {
        name: "Turn Shot",
        states: [
          { name: "TurnShotIdle", animation: NEUTRAL.name },
          ...turnShots.map((t) => ({ name: t.state, animation: t.anim.name })),
        ],
        transitions: [
          { from: "entry", to: "TurnShotIdle", durationMs: 0 },
          ...turnShots.map((t) => ({
            from: "any",
            to: t.state,
            durationMs: 90,
            condition: { input: t.trigger },
          })),
          ...turnShots.map((t) => ({
            from: t.state,
            to: "TurnShotIdle",
            durationMs: 160,
            exitTimeMs: Math.round((t.anim.duration / 60) * 1000),
          })),
        ],
      },
      {
        name: "Mood",
        states: moods.map((m) => ({ name: `Mood_${m.key}`, animation: m.anim.name })),
        transitions: [
          { from: "entry", to: "Mood_calm", durationMs: 0 },
          ...moods.map((m) => ({
            from: "any",
            to: `Mood_${m.key}`,
            durationMs: 240,
            condition: { input: "status", op: "==", value: m.status },
          })),
        ],
      },
      {
        name: "Reaction",
        states: [
          { name: "ReactionIdle", animation: NEUTRAL.name },
          ...reactions.map((r) => ({ name: `React_${r.key}`, animation: r.anim.name })),
        ],
        transitions: [
          { from: "entry", to: "ReactionIdle", durationMs: 0 },
          ...reactions.map((r) => ({
            from: "any",
            to: `React_${r.key}`,
            durationMs: 70,
            condition: { input: r.trigger },
          })),
          ...reactions.map((r) => ({
            from: `React_${r.key}`,
            to: "ReactionIdle",
            durationMs: 170,
            exitTimeMs: Math.round((r.anim.duration / 60) * 1000),
          })),
        ],
      },
      {
        name: "Gaze X",
        states: [
          {
            name: "GazeXBlend",
            blend1d: { input: "gazeX", animations: gaze.x.map((g) => ({ animation: g.anim.name, value: g.value })) },
          },
        ],
        transitions: [{ from: "entry", to: "GazeXBlend", durationMs: 0 }],
      },
      {
        name: "Gaze Y",
        states: [
          {
            name: "GazeYBlend",
            blend1d: { input: "gazeY", animations: gaze.y.map((g) => ({ animation: g.anim.name, value: g.value })) },
          },
        ],
        transitions: [{ from: "entry", to: "GazeYBlend", durationMs: 0 }],
      },
      {
        name: "Blink",
        states: [
          { name: "BlinkIdle", animation: NEUTRAL.name },
          ...blinks.map((b) => ({ name: `Blink_${b.key}`, animation: b.anim.name })),
        ],
        transitions: [
          { from: "entry", to: "BlinkIdle", durationMs: 0 },
          ...blinks.map((b) => ({ from: "any", to: `Blink_${b.key}`, durationMs: 0, condition: { input: b.trigger } })),
          ...blinks.map((b) => ({
            from: `Blink_${b.key}`,
            to: "BlinkIdle",
            durationMs: 0,
            exitTimeMs: Math.round((b.anim.duration / 60) * 1000),
          })),
        ],
      },
    ],
  };

  return {
    scene: {
      artboard: ARTBOARD,
      groups: buildGroups(),
      shapes: buildShapes(),
      animations,
      stateMachine,
    },
    meta: { moods, reactions, blinks, facingPoses, yawLoops, turnShots, gaze, energy, touch, showcaseTurn, showcaseEmotions },
  };
}
