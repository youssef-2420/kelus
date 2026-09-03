export function isDemoClockEnabled() {
  return process.env.NODE_ENV === "development";
}

export function advanceDemoClock(currentIso: string, days: number) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Demo clock is not available.");
  }
  return new Date(Date.parse(currentIso) + days * 86_400_000).toISOString();
}
