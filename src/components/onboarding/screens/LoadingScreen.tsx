"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import MascotAvatar from "../MascotAvatar";
import Blob from "../Blob";

const LOADING_PHASES = [
  { pct: 25, msg: "Alright...I've got a starting point!" },
  { pct: 50, msg: "We'll figure the rest out together as you go" },
  { pct: 80, msg: "First, let's confirm some deets about you..." },
];

interface LoadingScreenProps {
  onDone: () => void;
  avatarSrc?: string;
}

export default function LoadingScreen({ onDone, avatarSrc }: LoadingScreenProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [phaseIdx, setPhaseIdx] = useEffectState(0);
  const phase = LOADING_PHASES[phaseIdx];

  useEffect(() => {
    if (!barRef.current) return;

    const targetPct = `${phase.pct}%`;
    const tween = gsap.to(barRef.current, {
      width: targetPct,
      duration: 0.5,
      ease: "power2.out",
      onComplete: () => {
        setTimeout(() => {
          if (phaseIdx < LOADING_PHASES.length - 1) {
            setPhaseIdx((i) => i + 1);
          } else {
            onDone();
          }
        }, 600);
      },
    });

    return () => {
      tween.kill();
    };
  }, [onDone, phase.pct, phaseIdx, setPhaseIdx]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative w-full max-w-160 px-8 flex flex-col items-center text-center"
    >
      <Blob color="#f5d88a" className="w-60 h-60 -bottom-20 -left-20" />
      <Blob color="#93c5fd" className="w-50 h-50 -top-15 -right-15" />
      <div className="relative flex flex-col items-center">
        <MascotAvatar size={130} src={avatarSrc} />
        <p className="text-[15px] text-[#bbb] mb-4 font-semibold tracking-wide">
          {phase.pct}%
        </p>
        <p className="text-[24px] font-semibold text-[#1a1a1a] leading-[1.35] mb-2 max-w-160">
          {phase.msg}
        </p>
        <p className="text-[14px] text-[#aaa]">Building your space</p>
      </div>
      <div className="mt-8 h-[5px] w-full overflow-hidden rounded-full bg-[#eee]">
        <div
          ref={barRef}
          className="h-full rounded-full bg-[#3b7cf4]"
          style={{ width: "0%" }}
        />
      </div>
    </motion.div>
  );
}

// Helper hook for useEffect with state setter that works in render
function useEffectState<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState(initial);
  return [state, setState];
}

function useState<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const ref = useRef<T>(initial);
  const [, forceUpdate] = useStateReducer((x) => x + 1, 0);

  return [
    ref.current,
    (newVal: T | ((prev: T) => T)) => {
      ref.current = typeof newVal === "function" ? (newVal as (prev: T) => T)(ref.current) : newVal;
      forceUpdate((x) => x + 1);
    },
  ];
}

function useStateReducer<T>(reducer: (x: T) => T, initial: T): [T, React.Dispatch<() => void>] {
  const [state, setState] = React.useState(initial);
  const dispatch = () => setState(reducer);
  return [state, dispatch];
}
