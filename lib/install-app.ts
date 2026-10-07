/**
 * Installing Kelus as an app. Chrome and Edge (Android and desktop) offer a real install prompt, which arrives once,
 * early, as "beforeinstallprompt": it is kept here until the learner taps Install. iPhone and iPad have no prompt;
 * Safari adds a site to the home screen from its Share menu, so the card explains that instead.
 */

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type InstallState = "installed" | "prompt" | "ios" | "unavailable";

const EVENT = "kelus-install";
let deferred: InstallPrompt | null = null;
let listening = false;
let installed = false;

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with touch.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function listenForInstall() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPrompt;
    window.dispatchEvent(new Event(EVENT));
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    window.dispatchEvent(new Event(EVENT));
  });
}

export function installState(): InstallState {
  if (typeof window === "undefined") return "unavailable";
  if (installed || standalone()) return "installed";
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  return "unavailable";
}

export const serverInstallState = (): InstallState => "unavailable";

export function subscribeInstall(onChange: () => void) {
  listenForInstall();
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Shows the browser's own install dialog. Must run from a tap. */
export async function promptInstall() {
  if (!deferred) return false;
  const prompt = deferred;
  deferred = null;
  await prompt.prompt();
  const choice = await prompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
  window.dispatchEvent(new Event(EVENT));
  return choice.outcome === "accepted";
}

/** Kelus opened from the home screen, not a browser tab. */
export function runningAsApp() {
  return typeof window !== "undefined" && standalone();
}
