"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createKid } from "@/app/actions/kids";
import { allergyLabels } from "@/utils/kids/format";
import { ALLERGY_TAGS, type AddKidState, type AllergyTag, type Room } from "@/utils/kids/types";

type AddKidModalProps = {
  rooms: Room[];
  today: string;
  onClose: () => void;
};

type FormValues = {
  name: string;
  birthDate: string;
  roomId: string;
  medicalNotes: string;
};

const initialValues: FormValues = {
  name: "",
  birthDate: "",
  roomId: "",
  medicalNotes: "",
};

export function AddKidModal({ rooms, today, onClose }: AddKidModalProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createKid, {});
  const [form, setForm] = useState(initialValues);
  const [selectedTags, setSelectedTags] = useState<AllergyTag[]>([]);
  const savedKidId = state.savedKidId;

  useEffect(() => {
    if (!savedKidId) return;

    router.refresh();
    onClose();
  }, [savedKidId, onClose, router]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTag(tag: AllergyTag) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-6 sm:py-10" role="presentation" onMouseDown={onClose}>
      <form className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.55)]" role="dialog" aria-modal="true" aria-labelledby="add-kid-title" action={formAction} onReset={(event) => event.preventDefault()} onMouseDown={(event) => event.stopPropagation()} noValidate>
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-5 py-4 sm:px-[26px]">
          <button type="button" className="text-[15px] font-bold text-[#94887B] hover:text-[#6E6359]" onClick={onClose}>Cancelar</button>
          <h2 id="add-kid-title" className="m-0 font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">Agregar niño</h2>
          <button type="submit" className="text-[15px] font-extrabold text-[#D9583C] hover:text-[#C5503A] disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || rooms.length === 0}>{isPending ? "Guardando…" : "Guardar"}</button>
        </div>

        <div className="space-y-[18px] px-5 py-6 sm:px-[26px]">
          <Field label="NOMBRE COMPLETO" htmlFor="kid-name" error={state.errors?.name} errorId="kid-name-error">
            <input id="kid-name" name="name" className={inputClass(Boolean(state.errors?.name))} placeholder="Ej. Martina López" value={form.name} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(state.errors?.name)} aria-describedby={state.errors?.name ? "kid-name-error" : undefined} autoComplete="off" />
          </Field>

          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <Field label="FECHA DE NACIMIENTO" htmlFor="kid-birth-date" error={state.errors?.birthDate} errorId="kid-birth-date-error">
              <input id="kid-birth-date" name="birthDate" type="date" max={today} className={inputClass(Boolean(state.errors?.birthDate))} value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} aria-invalid={Boolean(state.errors?.birthDate)} aria-describedby={state.errors?.birthDate ? "kid-birth-date-error" : undefined} />
            </Field>
            <Field label="SALA" htmlFor="kid-room" error={state.errors?.roomId} errorId="kid-room-error">
              <select id="kid-room" name="roomId" className={inputClass(Boolean(state.errors?.roomId))} value={form.roomId} onChange={(event) => updateField("roomId", event.target.value)} aria-invalid={Boolean(state.errors?.roomId)} aria-describedby={state.errors?.roomId ? "kid-room-error" : undefined}>
                <option value="">Seleccioná una sala</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </Field>
          </div>

          {rooms.length === 0 ? (
            <p className="rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-[#C5503A]">No hay salas disponibles para tu guardería. Contactá a un administrador.</p>
          ) : null}

          <div>
            <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#94887B]">ALERGIAS (ETIQUETAS)</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Alergias">
              {ALLERGY_TAGS.map((tag) => {
                const checked = selectedTags.includes(tag);

                return (
                  <label key={tag} className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" name="allergyTags" value={tag} checked={checked} onChange={() => toggleTag(tag)} />
                    <span className={`inline-flex rounded-full border-[1.5px] px-3.5 py-2 text-[12.5px] font-extrabold transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#D9583C]/40 ${checked ? "border-[#D9684A] bg-[#FBD8CC] text-[#C5503A]" : "border-[#EADFD0] bg-white text-[#6E6359]"}`}>{allergyLabels[tag]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Field label="NOTAS MÉDICAS" htmlFor="kid-medical-notes">
            <textarea id="kid-medical-notes" name="medicalNotes" className={`${inputClass(false)} min-h-[90px] resize-y leading-[1.5]`} placeholder="Indicaciones, medicación, contactos…" value={form.medicalNotes} onChange={(event) => updateField("medicalNotes", event.target.value)} />
          </Field>

          {state.formError ? <p id="add-kid-form-error" role="alert" className="rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-[#C5503A]">{state.formError}</p> : null}
        </div>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, error, errorId, children }: { label: string; htmlFor: string; error?: string; errorId?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-[#94887B]">{label}</label>
      {children}
      {error ? <p id={errorId} role="alert" className="mt-1.5 text-[12px] font-bold text-[#C5413A]">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-[14px] border-[1.5px] ${hasError ? "border-[#D9583C]" : "border-[#EADFD0]"} bg-white px-4 py-[13px] text-[15px] text-[#3F362E] outline-none placeholder:text-[#B6A99B] focus:border-[#D9583C]`;
}
