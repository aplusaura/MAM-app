"use client";

import { useCallback } from "react";

export type SoundType = "success" | "error" | "notification" | "click" | "warning";

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.1,
  delay = 0,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

export function useSound() {
  const play = useCallback((type: SoundType) => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new AudioContext();
      switch (type) {
        case "success":
          // Ascending three-note chime: C5 → E5 → G5
          playTone(ctx, 523.25, 0.12, "sine", 0.1);
          playTone(ctx, 659.25, 0.12, "sine", 0.1, 0.1);
          playTone(ctx, 783.99, 0.2, "sine", 0.1, 0.2);
          break;
        case "error":
          // Descending two-tone: E4 → C4
          playTone(ctx, 329.63, 0.18, "sine", 0.12);
          playTone(ctx, 261.63, 0.28, "sine", 0.12, 0.15);
          break;
        case "notification":
          // Soft double ping
          playTone(ctx, 880, 0.1, "sine", 0.09);
          playTone(ctx, 1108.73, 0.14, "sine", 0.09, 0.1);
          break;
        case "click":
          // Very short soft click
          playTone(ctx, 600, 0.04, "sine", 0.05);
          break;
        case "warning":
          // Double pulse at A4
          playTone(ctx, 440, 0.14, "sine", 0.1);
          playTone(ctx, 440, 0.14, "sine", 0.08, 0.2);
          break;
      }
    } catch {
      // AudioContext blocked or not supported — fail silently
    }
  }, []);

  return { play };
}
