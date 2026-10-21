import type { AllergyTag, Kid } from "./types";

export const allergyLabels: Record<AllergyTag, string> = {
  peanut: "MANÍ",
  lactose: "LACTOSA",
  gluten: "GLUTEN",
  egg: "HUEVO",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type IsoDateParts = {
  year: number;
  month: number;
  day: number;
};

export function parseIsoDate(value: string): IsoDateParts | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day };
}

export function isValidIsoDate(value: string) {
  return parseIsoDate(value) !== null;
}

export function formatBirthDate(value: string) {
  const parts = parseIsoDate(value);

  if (!parts) return value;

  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function formatEnrollmentDate(value: string) {
  const parts = parseIsoDate(value);

  if (!parts) return value;

  return `${MONTHS[parts.month - 1]} ${parts.year}`;
}

export function calculateAge(birthDate: string, today = new Date()) {
  const parts = parseIsoDate(birthDate);

  if (!parts) return 0;

  let age = today.getFullYear() - parts.year;
  const birthdayHasNotHappened =
    today.getMonth() + 1 < parts.month ||
    (today.getMonth() + 1 === parts.month && today.getDate() < parts.day);

  if (birthdayHasNotHappened) age -= 1;

  return Math.max(age, 0);
}

export function formatAllergiesAndNotes(kid: Pick<Kid, "allergyTags" | "medicalNotes">) {
  const tags = kid.allergyTags.map((tag) => allergyLabels[tag]).filter(Boolean);
  const notes = kid.medicalNotes?.trim();
  const details = [...tags, notes].filter(Boolean);

  return details.length ? details.join(". ") : "Sin alergias registradas.";
}

export function initialOf(fullName: string) {
  return fullName.trim().charAt(0).toUpperCase();
}

const AVATAR_PALETTE = [
  { background: "#A9D9E8", color: "#1F7A93" },
  { background: "#F4B8CC", color: "#C44A7A" },
  { background: "#B9DEC4", color: "#3E8B62" },
  { background: "#F4DC8E", color: "#9A7B1E" },
  { background: "#C9B6E8", color: "#7B5FC0" },
] as const;

export function avatarColors(seed: string) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash + character.codePointAt(0)!) % 997;
  }

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
