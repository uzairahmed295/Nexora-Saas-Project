import { useSyncExternalStore } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type PWAState = {
  status: "development" | "unavailable" | "caching" | "ready" | "error";
  installable: boolean;
  updateReady: boolean;
  installed: boolean;
};
let state: PWAState = {
  status: import.meta.env.PROD ? "caching" : "development",
  installable: false,
  updateReady: false,
  installed:
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches,
};
let registration: ServiceWorkerRegistration | undefined;
let installEvent: InstallEvent | undefined;
const listeners = new Set<() => void>();
const set = (patch: Partial<PWAState>) => {
  state = { ...state, ...patch };
  listeners.forEach((f) => f());
};
export const usePWA = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state,
  );
export async function registerPWA() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event as InstallEvent;
    set({ installable: true });
  });
  window.addEventListener("appinstalled", () => {
    installEvent = undefined;
    set({ installable: false, installed: true });
  });
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    set({ status: "unavailable" });
    return;
  }
  try {
    registration = await navigator.serviceWorker.register("/sw.js");
    if (registration.active) set({ status: "ready" });
    if (registration.waiting) set({ updateReady: true });
    registration.addEventListener("updatefound", () => {
      const installing = registration!.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") {
          set({
            status: "ready",
            updateReady: Boolean(navigator.serviceWorker.controller),
          });
        }
        if (installing.state === "redundant") set({ status: "error" });
      });
    });
    await navigator.serviceWorker.ready;
    set({ status: "ready" });
  } catch {
    set({ status: "error" });
  }
}
export async function installPWA() {
  if (!installEvent) return "unavailable";
  await installEvent.prompt();
  const result = await installEvent.userChoice;
  installEvent = undefined;
  set({ installable: false });
  return result.outcome;
}
export function applyPWAUpdate() {
  if (!registration?.waiting) return;
  let refreshing = false;
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    },
    { once: true },
  );
  registration.waiting.postMessage("SKIP_WAITING");
}
