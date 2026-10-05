/* oxlint-disable react/immutability -- Rive inputs are mutable runtime handles. */
/* oxlint-disable react/only-export-components -- Copyable wrapper includes its typed input vocabulary. */
/**
 * Kettlebell Bot — React wrapper for rive/kettlebell-bot.riv
 *
 * The .riv exposes one state machine with twelve independent layers, so mood,
 * facing, gaze, intensity, touch and blinks all compose instead of overriding
 * each other. This wrapper mirrors that: props for the persistent inputs, a ref
 * for the one-shots, and an optional drag gesture that turns the bot.
 *
 * npm i @rive-app/react-canvas
 * (React Native: @rive-app/react-native — same inputs, `setInputState` API.)
 */
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const MACHINE = "KettlebellBotMachine";
const ARTBOARD = "KettlebellBot";

/** Persistent mood — the `status` input. */
export const MOOD = {
  calm: 0,
  curious: 1,
  thinking: 2,
  working: 3,
  bored: 4,
  blocked: 5,
  sleepy: 6,
  focused: 7,
  excited: 8,
  happy: 9,
  proud: 10,
  confused: 11,
  skeptical: 12,
  nervous: 13,
  playful: 14,
  listening: 15,
  determined: 16,
  exhausted: 17,
  recovering: 18,
  cheeky: 19,
} as const;

export type KettlebellBotMood = keyof typeof MOOD;

/** 0 lets the mood/reaction choose; other values select an eye-only pose. */
export const EYES = { auto: 0, pill: 1, tall: 2, round: 3, slit: 4, arc: 5, wedge: 6, star: 7,
  soft: 8, wide: 9, squint: 10, crescent: 11, frown: 12, droop: 13, diamond: 14 } as const;
export type KettlebellBotEyes = keyof typeof EYES;
export const EFFECTS = ["fxSparkles", "fxMotes", "fxSweat", "fxDust"] as const;
export type KettlebellBotEffect = (typeof EFFECTS)[number];

/** One-shot triggers, grouped by what they are for. */
export const REACTIONS = [
  "acknowledge",
  "surprise",
  "celebrate",
  "frustrated",
  "relieved",
  "wobble",
  "gearUp",
  "laugh",
  "tapped",
  "recoil",
  "powerUp",
  "personalBest",
  "cheer",
  "appreciate",
  "idea",
  "dizzy",
] as const;

export const TURNS = ["spinRight", "spinLeft", "turnaround", "peek"] as const;
export const BLINKS = ["blink", "blinkDouble", "wink"] as const;

const TRIGGERS = [...REACTIONS, ...TURNS, ...BLINKS, ...EFFECTS] as const;
export type KettlebellBotTrigger = (typeof TRIGGERS)[number];

export type KettlebellBotHandle = Record<KettlebellBotTrigger, () => void> & {
  /** Point the eyes at a spot, in -1..1 on each axis. */
  lookAt(x: number, y: number): void;
  /** Set the facing angle directly, in degrees (0 = front, 180 = back). */
  faceTowards(degrees: number): void;
  /** Select a shape, or yield back to the underlying mood/reaction. */
  setEyes(eyes: KettlebellBotEyes): void;
};

export interface KettlebellBotProps {
  /** Persistent emotional state. */
  mood?: KettlebellBotMood;
  eyes?: KettlebellBotEyes;
  /** Particle visibility, 0..1. Effects only play when explicitly triggered. */
  effectsIntensity?: number;
  /** 0 = looking at you, 90 = right profile, 180 = away, 270 = left profile. */
  facing?: number;
  /** Eye direction, -1..1. gazeY is positive downward. */
  gaze?: { x?: number; y?: number };
  /** Overall liveliness, 0..1. Scales the ambient motion, not the mood. */
  intensity?: number;
  /** Drag horizontally to turn the bot and tap it for a touch reaction. */
  interactive?: boolean;
  /** Degrees of facing per pixel dragged. */
  dragSensitivity?: number;
  size?: number;
  src?: string;
  onTap?(): void;
}

const wrap360 = (value: number) => ((value % 360) + 360) % 360;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const KettlebellBot = forwardRef<KettlebellBotHandle, KettlebellBotProps>(
  function KettlebellBot(
    {
      mood = "calm",
      eyes = "auto",
      effectsIntensity = 1,
      facing = 0,
      gaze,
      intensity = 0.5,
      interactive = true,
      dragSensitivity = 0.9,
      size = 160,
      src = "/kettlebell-bot.riv",
      onTap,
    },
    ref,
  ) {
    const { rive, RiveComponent } = useRive({
      src,
      artboard: ARTBOARD,
      stateMachines: MACHINE,
      autoplay: true,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    });

    const status = useStateMachineInput(rive, MACHINE, "status");
    const facingInput = useStateMachineInput(rive, MACHINE, "facing");
    const gazeX = useStateMachineInput(rive, MACHINE, "gazeX");
    const gazeY = useStateMachineInput(rive, MACHINE, "gazeY");
    const intensityInput = useStateMachineInput(rive, MACHINE, "intensity");
    const hover = useStateMachineInput(rive, MACHINE, "hover");
    const pressed = useStateMachineInput(rive, MACHINE, "pressed");
    const eyesInput = useStateMachineInput(rive, MACHINE, "eyes");
    const effectsIntensityInput = useStateMachineInput(rive, MACHINE, "effectsIntensity");

    // Written out one call at a time on purpose: hooks in a loop would trip
    // react-hooks/rules-of-hooks in whatever project pastes this file.
    const acknowledge = useStateMachineInput(rive, MACHINE, "acknowledge");
    const surprise = useStateMachineInput(rive, MACHINE, "surprise");
    const celebrate = useStateMachineInput(rive, MACHINE, "celebrate");
    const frustrated = useStateMachineInput(rive, MACHINE, "frustrated");
    const relieved = useStateMachineInput(rive, MACHINE, "relieved");
    const wobble = useStateMachineInput(rive, MACHINE, "wobble");
    const gearUp = useStateMachineInput(rive, MACHINE, "gearUp");
    const laugh = useStateMachineInput(rive, MACHINE, "laugh");
    const tapped = useStateMachineInput(rive, MACHINE, "tapped");
    const recoil = useStateMachineInput(rive, MACHINE, "recoil");
    const spinRight = useStateMachineInput(rive, MACHINE, "spinRight");
    const spinLeft = useStateMachineInput(rive, MACHINE, "spinLeft");
    const turnaround = useStateMachineInput(rive, MACHINE, "turnaround");
    const peek = useStateMachineInput(rive, MACHINE, "peek");
    const blink = useStateMachineInput(rive, MACHINE, "blink");
    const blinkDouble = useStateMachineInput(rive, MACHINE, "blinkDouble");
    const wink = useStateMachineInput(rive, MACHINE, "wink");

    const powerUp = useStateMachineInput(rive, MACHINE, "powerUp");
    const personalBest = useStateMachineInput(rive, MACHINE, "personalBest");
    const cheer = useStateMachineInput(rive, MACHINE, "cheer");
    const appreciate = useStateMachineInput(rive, MACHINE, "appreciate");
    const idea = useStateMachineInput(rive, MACHINE, "idea");
    const dizzy = useStateMachineInput(rive, MACHINE, "dizzy");
    const fxSparkles = useStateMachineInput(rive, MACHINE, "fxSparkles");
    const fxMotes = useStateMachineInput(rive, MACHINE, "fxMotes");
    const fxSweat = useStateMachineInput(rive, MACHINE, "fxSweat");
    const fxDust = useStateMachineInput(rive, MACHINE, "fxDust");

    useEffect(() => {
      if (status) status.value = MOOD[mood];
    }, [mood, status]);
    useEffect(() => { if (eyesInput) eyesInput.value = EYES[eyes]; }, [eyes, eyesInput]);
    useEffect(() => { if (effectsIntensityInput) effectsIntensityInput.value = clamp(effectsIntensity, 0, 1); }, [effectsIntensity, effectsIntensityInput]);

    useEffect(() => {
      if (facingInput) facingInput.value = wrap360(facing);
    }, [facing, facingInput]);

    useEffect(() => {
      if (gazeX) gazeX.value = clamp(gaze?.x ?? 0, -1, 1);
      if (gazeY) gazeY.value = clamp(gaze?.y ?? 0, -1, 1);
    }, [gaze?.x, gaze?.y, gazeX, gazeY]);

    useEffect(() => {
      if (intensityInput) intensityInput.value = clamp(intensity, 0, 1);
    }, [intensity, intensityInput]);

    useImperativeHandle(
      ref,
      () => ({
        acknowledge: () => acknowledge?.fire(),
        surprise: () => surprise?.fire(),
        celebrate: () => celebrate?.fire(),
        frustrated: () => frustrated?.fire(),
        relieved: () => relieved?.fire(),
        wobble: () => wobble?.fire(),
        gearUp: () => gearUp?.fire(),
        laugh: () => laugh?.fire(),
        tapped: () => tapped?.fire(),
        recoil: () => recoil?.fire(),
        powerUp: () => powerUp?.fire(),
        personalBest: () => personalBest?.fire(),
        cheer: () => cheer?.fire(),
        appreciate: () => appreciate?.fire(),
        idea: () => idea?.fire(),
        dizzy: () => dizzy?.fire(),
        fxSparkles: () => fxSparkles?.fire(),
        fxMotes: () => fxMotes?.fire(),
        fxSweat: () => fxSweat?.fire(),
        fxDust: () => fxDust?.fire(),
        setEyes(value: KettlebellBotEyes) { if (eyesInput) eyesInput.value = EYES[value]; },
        spinRight: () => spinRight?.fire(),
        spinLeft: () => spinLeft?.fire(),
        turnaround: () => turnaround?.fire(),
        peek: () => peek?.fire(),
        blink: () => blink?.fire(),
        blinkDouble: () => blinkDouble?.fire(),
        wink: () => wink?.fire(),
        lookAt(x: number, y: number) {
          if (gazeX) gazeX.value = clamp(x, -1, 1);
          if (gazeY) gazeY.value = clamp(y, -1, 1);
        },
        faceTowards(degrees: number) {
          if (facingInput) facingInput.value = wrap360(degrees);
        },
      }),
      [
        acknowledge, blink, blinkDouble, celebrate, facingInput, frustrated,
        gazeX, gazeY, gearUp, laugh, peek, recoil, relieved, spinLeft,
        spinRight, surprise, tapped, turnaround, wink, wobble,
        powerUp, personalBest, cheer, appreciate, idea, dizzy,
        eyesInput, fxSparkles, fxMotes, fxSweat, fxDust,
      ],
    );

    // --- drag to turn, tap to poke ----------------------------------------
    const drag = useRef<{ id: number; x: number; from: number; moved: number } | null>(null);

    const onPointerDown = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          from: Number(facingInput?.value ?? 0),
          moved: 0,
        };
        if (pressed) pressed.value = true;
      },
      [facingInput, interactive, pressed],
    );

    const onPointerMove = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive) return;
        const current = drag.current;
        if (!current || current.id !== event.pointerId) {
          // Not dragging: let the eyes follow the pointer across the element.
          const box = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - box.left) / box.width) * 2 - 1;
          const y = ((event.clientY - box.top) / box.height) * 2 - 1;
          if (gazeX) gazeX.value = clamp(x * 1.4, -1, 1);
          if (gazeY) gazeY.value = clamp(y * 1.4, -1, 1);
          return;
        }
        const dx = event.clientX - current.x;
        current.moved = Math.max(current.moved, Math.abs(dx));
        if (facingInput) facingInput.value = wrap360(current.from + dx * dragSensitivity);
      },
      [dragSensitivity, facingInput, gazeX, gazeY, interactive],
    );

    const endDrag = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive) return;
        const current = drag.current;
        drag.current = null;
        if (pressed) pressed.value = false;
        // Under the drag threshold it was a tap, not a turn.
        if (current && current.moved < 6) {
          tapped?.fire();
          onTap?.();
        }
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      },
      [interactive, onTap, pressed, tapped],
    );

    const onPointerEnter = useCallback(() => {
      if (interactive && hover) hover.value = true;
    }, [hover, interactive]);

    const onPointerLeave = useCallback(() => {
      if (!interactive) return;
      if (hover) hover.value = false;
      if (pressed) pressed.value = false;
      if (gazeX) gazeX.value = 0;
      if (gazeY) gazeY.value = 0;
    }, [gazeX, gazeY, hover, interactive, pressed]);

    return (
      <div
        role="img"
        aria-label={`Kettlebell Bot, ${mood}`}
        style={{ width: size, height: size, touchAction: "none", cursor: interactive ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>
    );
  },
);

/* ---------------------------------------------------------------------------
 * Usage
 *
 * const bot = useRef<KettlebellBotHandle>(null);
 *
 * <KettlebellBot ref={bot} mood={busy ? "working" : "calm"} intensity={0.6} />
 *
 * await runTask();                 // ...then react to what happened:
 * bot.current?.celebrate();        // finished
 * bot.current?.frustrated();       // failed
 * bot.current?.acknowledge();      // received the user's request
 * bot.current?.turnaround();       // full 360, both profiles and the back
 *
 * bot.current?.personalBest();
 * bot.current?.setEyes("crescent");
 * bot.current?.fxMotes();          // independent, no body reaction
 * bot.current?.setEyes("auto");   // return to mood/reaction eyes
 *
 * Every trigger is fire-and-forget: Reaction, Turn, Blink and Effects each
 * return to the mood underneath on their own, so no cleanup or state reset is
 * needed. Debounce a trigger by ~100 ms after changing `mood`.
 * ------------------------------------------------------------------------- */
