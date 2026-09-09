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

function downloadBlob(filename: string, contents: string, type: string) {
  if (typeof document === "undefined") return false;
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

export function downloadTomorrowStudyIcs(input: Parameters<typeof buildTomorrowStudyIcs>[0]) {
  return downloadBlob("kelus-tomorrow-study.ics", buildTomorrowStudyIcs(input), "text/calendar;charset=utf-8");
}

function stampUtc(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildExamWeekIcs(input: {
  courseName: string;
  examTarget: string;
  days: Array<{ dateIso: string; minutes: number; stops: Array<{ name: string; minutes: number }> }>;
  todayUrl?: string;
  nowMs?: number;
}) {
  const now = new Date(input.nowMs ?? Date.now());
  const todayUrl = input.todayUrl ?? "https://kelus.me/today/";
  const events = input.days.map((day) => {
    const start = new Date(day.dateIso);
    start.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), 0, 0);
    const end = new Date(start.getTime() + Math.max(15, day.minutes) * 60_000);
    const names = day.stops.map((stop) => `${stop.name} (${stop.minutes} min)`).join(", ");
    return [
      "BEGIN:VEVENT",
      `UID:kelus-exam-week-${stampUtc(start)}@kelus.me`,
      `DTSTAMP:${stampUtc(now)}`,
      `DTSTART:${stampUtc(start)}`,
      `DTEND:${stampUtc(end)}`,
      `SUMMARY:${escapeIcs(`Kelus · ${input.courseName}`)}`,
      `DESCRIPTION:${escapeIcs([names || input.examTarget, todayUrl].join(" "))}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kelus//Exam Week//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function buildExamWeekSheet(input: {
  courseName: string;
  examTarget: string;
  examDateIso: string;
  headline: string;
  days: Array<{ dateIso: string; minutes: number; stops: Array<{ name: string; minutes: number }> }>;
  uncoveredNames: string[];
}) {
  const examDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(input.examDateIso));
  const lines = [
    `Kelus exam week · ${input.courseName}`,
    `${input.examTarget} · ${examDay}`,
    input.headline,
    "Guidance from your ratings and recall checks — not a grade prediction.",
    "",
  ];
  for (const day of input.days) {
    const label = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(day.dateIso));
    lines.push(`${label} · ${day.minutes} min`);
    for (const stop of day.stops) lines.push(`- ${stop.name} · ${stop.minutes} min`);
    lines.push("");
  }
  if (input.uncoveredNames.length) {
    lines.push("Not scheduled at this daily pace:");
    for (const name of input.uncoveredNames) lines.push(`- ${name}`);
    lines.push("");
  }
  lines.push("Open Today to recalculate after each session: https://kelus.me/today/");
  return `${lines.join("\n")}\n`;
}

export function downloadExamWeekIcs(input: Parameters<typeof buildExamWeekIcs>[0]) {
  return downloadBlob("kelus-exam-week.ics", buildExamWeekIcs(input), "text/calendar;charset=utf-8");
}

export function downloadExamWeekSheet(input: Parameters<typeof buildExamWeekSheet>[0]) {
  return downloadBlob("kelus-exam-week.txt", buildExamWeekSheet(input), "text/plain;charset=utf-8");
}
