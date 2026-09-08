/** Build a one-off calendar invite for tomorrow’s study block. */
export function buildTomorrowStudyIcs(input: {
  courseName: string;
  minutes: number;
  nextStopName?: string | null;
  todayUrl?: string;
  nowMs?: number;
}) {
  const start = new Date(input.nowMs ?? Date.now());
  start.setDate(start.getDate() + 1);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + Math.max(15, input.minutes) * 60_000);
  const stamp = (value: Date) =>
    value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escape = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const title = escape(`Kelus · ${input.courseName}`);
  const description = escape(
    [
      input.nextStopName ? `Suggested first stop: ${input.nextStopName}.` : "Open Today for your next route.",
      input.todayUrl ?? "https://kelus.me/today/",
    ].join(" "),
  );
  const uid = `kelus-study-${stamp(start)}@kelus.me`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kelus//Study Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date(input.nowMs ?? Date.now()))}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadTomorrowStudyIcs(input: Parameters<typeof buildTomorrowStudyIcs>[0]) {
  if (typeof document === "undefined") return false;
  const ics = buildTomorrowStudyIcs(input);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "kelus-tomorrow-study.ics";
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
