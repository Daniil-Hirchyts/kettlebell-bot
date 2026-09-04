import {
  Alignment,
  Fit,
  useRive,
  useStateMachineInput,
} from "@rive-app/react-canvas";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
} from "react";

const MACHINE = "KettlebellBotMachine";

const STATUS = {
  idle: 0,
  thinking: 1,
  working: 2,
  waiting: 3,
  blocked: 4,
} as const;

export type KettlebellBotState = keyof typeof STATUS;

export interface KettlebellBotHandle {
  acknowledge(): void;
  complete(): void;
  blink(): void;
}

interface KettlebellBotProps {
  state: KettlebellBotState;
  size?: number;
  src?: string;
}

export const KettlebellBot = forwardRef<KettlebellBotHandle, KettlebellBotProps>(
  function KettlebellBot(
    { state, size = 48, src = "/kettlebell-bot.riv" },
    ref,
  ) {
    const { rive, RiveComponent } = useRive({
      src,
      artboard: "KettlebellBot",
      stateMachines: MACHINE,
      autoplay: true,
      layout: { fit: Fit.Contain, alignment: Alignment.Center },
    });

    const status = useStateMachineInput(rive, MACHINE, "status");
    const acknowledge = useStateMachineInput(rive, MACHINE, "acknowledge");
    const complete = useStateMachineInput(rive, MACHINE, "complete");
    const blink = useStateMachineInput(rive, MACHINE, "blink");

    useEffect(() => {
      if (status) status.value = STATUS[state];
    }, [state, status]);

    useImperativeHandle(
      ref,
      () => ({
        acknowledge: () => acknowledge?.fire(),
        complete: () => complete?.fire(),
        blink: () => blink?.fire(),
      }),
      [acknowledge, blink, complete],
    );

    return <RiveComponent style={{ width: size, height: size }} />;
  },
);
