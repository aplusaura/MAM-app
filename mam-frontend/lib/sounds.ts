export type SoundType = "success" | "error" | "notification" | "click" | "warning";

/**
 * Dispatch a sound event. SoundLayer (in the dashboard layout) listens for
 * this and plays the corresponding Web Audio tone.
 */
export function playSound(type: SoundType) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mam:sound", { detail: { type } }));
}
