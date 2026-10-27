import { DAYCARE_TIME_ZONE } from "./time";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const monthDayFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  timeZone: DAYCARE_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: DAYCARE_TIME_ZONE,
});

const yearFormatter = new Intl.DateTimeFormat("es-MX", {
  year: "numeric",
  timeZone: DAYCARE_TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat("es-MX", {
  weekday: "long",
  timeZone: DAYCARE_TIME_ZONE,
});

function clean(value: string): string {
  return value.replace(/\.$/, "").replace(/\s+/g, " ").trim();
}

function monthDay(date: Date): string {
  return clean(monthDayFormatter.format(date));
}

function time(date: Date): string {
  return timeFormatter.format(date).replace(/\s/g, "");
}

export function formatPostDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  const elapsed = now.getTime() - date.getTime();

  if (elapsed < MINUTE) return "ahora";
  if (elapsed < HOUR) return `hace ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `hace ${Math.floor(elapsed / HOUR)} h`;

  if (yearFormatter.format(date) === yearFormatter.format(now)) {
    return `${monthDay(date)}, ${time(date)}`;
  }

  return `${monthDay(date)} ${yearFormatter.format(date)}`;
}

export function formatHeaderDate(now: Date = new Date()): string {
  return `${clean(weekdayFormatter.format(now))} ${monthDay(now)}`;
}

export function formatPostTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return time(date);
}

export function formatSummaryDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: DAYCARE_TIME_ZONE,
  }).formatToParts(now);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.weekday} ${values.day} de ${values.month}`;
}
