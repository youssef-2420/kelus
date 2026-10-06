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

export const REMINDER_TIMES = ["07:30", "12:30", "16:30", "18:00", "20:00", "21:30"] as const;

const pad = (value: number) => String(value).padStart(2, "0");
const floating = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/**
 * A daily study block that repeats until the exam, with an alert at the start time. It uses the learner's own
 * calendar app because a website that is closed cannot send notifications. Times are "floating", so the
 * block stays at the same local clock time if the learner travels.
 */
export function buildDailyStudyIcs(input: {
  courseName: string;
  minutes: number;
  time: string;
  examDate: string; // YYYY-MM-DD
  nextStopName?: string | null;
  nowMs?: number;
}) {
  const now = new Date(input.nowMs ?? Date.now());
  const [hours, minutes] = /^\d{1,2}:\d{2}$/.test(input.time) ? input.time.split(":").map(Number) : [18, 0];
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  if (first.getTime() <= now.getTime()) first.setDate(first.getDate() + 1);
  const end = new Date(first.getTime() + Math.max(15, input.minutes) * 60_000);
  const exam = /^\d{4}-\d{2}-\d{2}$/.test(input.examDate) ? new Date(`${input.examDate}T00:00:00`) : null;
  const lastDay = exam ? new Date(exam.getFullYear(), exam.getMonth(), exam.getDate(), 23, 59, 59) : null;
  const repeats = lastDay !== null && lastDay.getTime() > first.getTime();
  const slug = input.courseName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
  const description = escapeText([
    input.nextStopName ? `Start with ${input.nextStopName}.` : "Open Today for your next topic.",
    "A few minutes a day beats a long cram. https://kelus.me/today/",
  ].join(" "));
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kelus//Daily Study Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable per course and exam, so adding it again replaces the old one instead of doubling it.
    `UID:kelus-daily-${slug}-${input.examDate || "open"}@kelus.me`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART:${floating(first)}`,
    `DTEND:${floating(end)}`,
    ...(repeats ? [`RRULE:FREQ=DAILY;UNTIL=${floating(lastDay!)}`] : []),
    `SUMMARY:${escapeText(`Kelus · ${input.courseName}`)}`,
    `DESCRIPTION:${description}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`Time to study ${input.courseName}`)}`,
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadDailyStudyIcs(input: Parameters<typeof buildDailyStudyIcs>[0]) {
  if (typeof document === "undefined") return false;
  const blob = new Blob([buildDailyStudyIcs(input)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "kelus-daily-study.ics";
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
