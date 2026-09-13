export type Sound = "success" | "notification" | "warning" | "error" | "ai";
let context: AudioContext | undefined;
let unlocked = false;
export async function unlockAudio() {
  try {
    context ??= new AudioContext();
    await context.resume();
    unlocked = context.state === "running";
    return unlocked;
  } catch {
    return false;
  }
}
export function installAudioUnlock() {
  const unlock = () => {
    void unlockAudio();
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}
export async function playSound(sound: Sound, enabled = true) {
  if (!enabled) return "muted";
  if (!context || !unlocked || context.state !== "running") return "blocked";
  const frequencies: Record<Sound, number[]> = {
    success: [523, 659, 784],
    notification: [659, 784],
    warning: [440, 440],
    error: [392, 294],
    ai: [523, 784, 1047],
  };
  const start = context.currentTime;
  frequencies[sound].forEach((hz, i) => {
    const o = context!.createOscillator(),
      g = context!.createGain();
    o.type = "sine";
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, start + i * 0.12);
    g.gain.linearRampToValueAtTime(0.07, start + i * 0.12 + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, start + i * 0.12 + 0.22);
    o.connect(g);
    g.connect(context!.destination);
    o.start(start + i * 0.12);
    o.stop(start + i * 0.12 + 0.24);
  });
  return "played";
}
