"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { kids as initialKids, type Kid } from "../data/kids";

export type AddKidForm = {
  name: string;
  birthDate: string;
  room: "Soles";
  allergies: string;
  medicalNotes: string;
};

type KidsContextValue = {
  kids: Kid[];
  addKid: (form: AddKidForm) => Kid;
};

const KidsContext = createContext<KidsContextValue | null>(null);

const avatarDefaults = {
  avatarBackground: "#DCE9C9",
  avatarColor: "#557C3E",
};

const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function KidsProvider({ children }: { children: ReactNode }) {
  const [kids, setKids] = useState<Kid[]>(() => [...initialKids]);

  function addKid(form: AddKidForm) {
    const birthDate = parseBirthDate(form.birthDate);
    const name = form.name.trim();
    const newKid: Kid = {
      id: slugify(name),
      name,
      initial: name.charAt(0).toUpperCase(),
      age: calculateAge(birthDate),
      ...avatarDefaults,
      room: form.room,
      birthDate: formatBirthDate(birthDate),
      enrollmentDate: formatEnrollmentDate(new Date()),
      allergiesAndNotes: formatAllergiesAndNotes(form.allergies, form.medicalNotes),
      parents: [],
    };

    setKids((currentKids) => [...currentKids, newKid]);
    return newKid;
  }

  const value = useMemo(() => ({ kids, addKid }), [kids]);

  return <KidsContext.Provider value={value}>{children}</KidsContext.Provider>;
}

export function useKids() {
  const context = useContext(KidsContext);

  if (!context) {
    throw new Error("useKids must be used within KidsProvider");
  }

  return context;
}

function parseBirthDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

function calculateAge(birthDate: Date) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasNotHappened = today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

  if (birthdayHasNotHappened) age -= 1;
  return age;
}

function formatBirthDate(date: Date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatEnrollmentDate(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatAllergiesAndNotes(allergies: string, medicalNotes: string) {
  const details = [allergies.trim(), medicalNotes.trim()].filter(Boolean);
  return details.length ? details.join(". ") : "Sin alergias registradas.";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
