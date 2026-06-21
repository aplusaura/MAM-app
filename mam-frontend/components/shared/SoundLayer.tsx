"use client";

import { useEffect } from "react";
import { useSound, type SoundType } from "@/hooks/useSound";

/**
 * Invisible component that lives in the dashboard layout.
 * Listens for "mam:sound" custom events dispatched by `lib/sounds.ts`
 * and plays the corresponding Web Audio tone.
 */
export function SoundLayer() {
  const { play } = useSound();

  useEffect(() => {
    const handler = (e: Event) => {
      const { type } = (e as CustomEvent<{ type: SoundType }>).detail;
      play(type);
    };
    window.addEventListener("mam:sound", handler);
    return () => window.removeEventListener("mam:sound", handler);
  }, [play]);

  return null;
}
