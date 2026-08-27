import type { LiveOfferEnvironment } from "@/services/server-offer-service";

declare global {
  // The Vinext worker and its React server renderer run in the same isolate.
  // This keeps request-time bindings server-only without serializing secrets.
  var __kelusRuntimeEnvironment: LiveOfferEnvironment | undefined;
}

export function setKelusRuntimeEnvironment(environment: LiveOfferEnvironment) {
  globalThis.__kelusRuntimeEnvironment = environment;
}

export function getKelusRuntimeEnvironment() {
  return globalThis.__kelusRuntimeEnvironment;
}
