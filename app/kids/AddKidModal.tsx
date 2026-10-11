"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useKids, type AddKidForm } from "../components/kids-provider";

type FormErrors = Partial<Record<keyof AddKidForm, string>>;

const initialForm: AddKidForm = {
  name: "",
  birthDate: "",
  room: "Soles",
  allergies: "",
  medicalNotes: "",
};

export function AddKidModal({ onClose }: { onClose: () => void }) {
  const { addKid } = useKids();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});

  function updateField(field: keyof AddKidForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));

    if (errors[field]) {
      setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    addKid(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-6 sm:py-10" role="presentation" onMouseDown={onClose}>
      <form className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.55)]" role="dialog" aria-modal="true" aria-labelledby="add-kid-title" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-5 py-4 sm:px-[26px]">
          <button type="button" className="text-[15px] font-bold text-[#94887B] hover:text-[#6E6359]" onClick={onClose}>Cancelar</button>
          <h2 id="add-kid-title" className="m-0 font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">Agregar niño</h2>
          <button type="submit" className="text-[15px] font-extrabold text-[#D9583C] hover:text-[#C5503A]">Guardar</button>
        </div>

        <div className="space-y-[18px] px-5 py-6 sm:px-[26px]">
          <Field label="NOMBRE COMPLETO" htmlFor="kid-name" error={errors.name}>
            <input id="kid-name" className={inputClass(Boolean(errors.name))} placeholder="Ej. Martina López" value={form.name} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(errors.name)} />
          </Field>

          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <Field label="FECHA DE NACIMIENTO" htmlFor="kid-birth-date" error={errors.birthDate}>
              <input id="kid-birth-date" className={inputClass(Boolean(errors.birthDate))} placeholder="dd/mm/aaaa" inputMode="numeric" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} aria-invalid={Boolean(errors.birthDate)} />
            </Field>
            <Field label="SALA" htmlFor="kid-room" error={errors.room}>
              <select id="kid-room" className={inputClass(Boolean(errors.room))} value={form.room} onChange={(event) => updateField("room", event.target.value as "Soles")} aria-invalid={Boolean(errors.room)}>
                <option value="Soles">Soles</option>
              </select>
            </Field>
          </div>

          <Field label="ALERGIAS (ETIQUETAS)" htmlFor="kid-allergies">
            <input id="kid-allergies" className={inputClass(false)} placeholder="Ej. Maní, Lactosa" value={form.allergies} onChange={(event) => updateField("allergies", event.target.value)} />
          </Field>

          <Field label="NOTAS MÉDICAS" htmlFor="kid-medical-notes">
            <textarea id="kid-medical-notes" className={`${inputClass(false)} min-h-[90px] resize-y leading-[1.5]`} placeholder="Indicaciones, medicación, contactos…" value={form.medicalNotes} onChange={(event) => updateField("medicalNotes", event.target.value)} />
          </Field>
        </div>

      </form>
    </div>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-[#94887B]">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-[12px] font-bold text-[#C5413A]">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-[14px] border-[1.5px] ${hasError ? "border-[#D9583C]" : "border-[#EADFD0]"} bg-white px-4 py-[13px] text-[15px] text-[#3F362E] outline-none placeholder:text-[#B6A99B] focus:border-[#D9583C]`;
}

function validate(form: AddKidForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = "Ingresa el nombre completo.";
  if (!form.birthDate) {
    errors.birthDate = "Ingresa la fecha de nacimiento.";
  } else if (!isValidBirthDate(form.birthDate)) {
    errors.birthDate = "Usa una fecha válida que no sea futura.";
  }
  if (!form.room) errors.room = "Selecciona una sala.";

  return errors;
}

function isValidBirthDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const today = new Date();

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date <= today;
}
