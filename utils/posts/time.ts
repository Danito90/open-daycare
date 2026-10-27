export const DAYCARE_TIME_ZONE =
  process.env.DAYCARE_TIME_ZONE ?? "America/Mexico_City";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function datePartsInZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = datePartsInZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const wholeSeconds = date.getTime() - date.getMilliseconds();

  return asUtc - wholeSeconds;
}

function localMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  const target = Date.UTC(year, month - 1, day);
  let instant = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = target - zoneOffsetMs(new Date(instant), timeZone);

    if (next === instant) break;

    instant = next;
  }

  return new Date(instant);
}

export function getLocalDayRange(now: Date = new Date(), timeZone: string = DAYCARE_TIME_ZONE) {
  const parts = datePartsInZone(now, timeZone);
  const start = localMidnightUtc(parts.year, parts.month, parts.day, timeZone);
  const followingDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const end = localMidnightUtc(
    followingDay.getUTCFullYear(),
    followingDay.getUTCMonth() + 1,
    followingDay.getUTCDate(),
    timeZone,
  );

  return { start: start.toISOString(), end: end.toISOString() };
}
