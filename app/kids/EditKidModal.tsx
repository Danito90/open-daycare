"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { editKid } from "@/app/actions/kids";
import { allergyLabels } from "@/utils/kids/format";
import { ALLERGY_TAGS, type AllergyTag, type Kid, type Room } from "@/utils/kids/types";

type EditKidModalProps = {
  kid: Kid;
  rooms: Room[];
  today: string;
  onClose: () => void;
};

type FormValues = {
  name: string;
  birthDate: string;
  enrolledAt: string;
  roomId: string;
  medicalNotes: string;
};

export function EditKidModal({ kid, rooms, today, onClose }: EditKidModalProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(editKid, {});
  const [form, setForm] = useState<FormValues>({
    name: kid.fullName,
    birthDate: kid.birthDate,
    enrolledAt: kid.enrolledAt,
    roomId: kid.roomId,
    medicalNotes: kid.medicalNotes ?? "",
  });
  const [selectedTags, setSelectedTags] = useState<AllergyTag[]>(kid.allergyTags);

  useEffect(() => {
    if (!state.saved) return;

    router.refresh();
    onClose();
  }, [state.saved, onClose, router]);

  function updateField(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTag(tag: AllergyTag) {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-6 sm:py-10" role="presentation" onMouseDown={onClose}>
      <form className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.55)]" role="dialog" aria-modal="true" aria-labelledby="edit-kid-title" action={formAction} onMouseDown={(event) => event.stopPropagation()} noValidate>
        <input type="hidden" name="childId" value={kid.id} />
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-5 py-4 sm:px-[26px]">
          <button type="button" className="text-[15px] font-bold text-ink-muted hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={onClose}>Cancelar</button>
          <h2 id="edit-kid-title" className="m-0 font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-ink-strong">Editar niño</h2>
          <button type="submit" className="text-[15px] font-extrabold text-brand hover:text-[#8A351F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || rooms.length === 0}>{isPending ? "Guardando…" : "Guardar"}</button>
        </div>

        <div className="space-y-[18px] px-5 py-6 sm:px-[26px]">
          <Field label="NOMBRE COMPLETO" htmlFor="edit-kid-name" error={state.errors?.name} errorId="edit-kid-name-error">
            <input id="edit-kid-name" name="name" className={inputClass(Boolean(state.errors?.name))} value={form.name} onChange={(event) => updateField("name", event.target.value)} aria-invalid={Boolean(state.errors?.name)} aria-describedby={state.errors?.name ? "edit-kid-name-error" : undefined} />
          </Field>

          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <Field label="FECHA DE NACIMIENTO" htmlFor="edit-kid-birth-date" error={state.errors?.birthDate} errorId="edit-kid-birth-date-error">
              <input id="edit-kid-birth-date" name="birthDate" type="date" max={today} className={inputClass(Boolean(state.errors?.birthDate))} value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} aria-invalid={Boolean(state.errors?.birthDate)} aria-describedby={state.errors?.birthDate ? "edit-kid-birth-date-error" : undefined} />
            </Field>
            <Field label="FECHA DE INGRESO" htmlFor="edit-kid-enrolled-at" error={state.errors?.enrolledAt} errorId="edit-kid-enrolled-at-error">
              <input id="edit-kid-enrolled-at" name="enrolledAt" type="date" max={today} className={inputClass(Boolean(state.errors?.enrolledAt))} value={form.enrolledAt} onChange={(event) => updateField("enrolledAt", event.target.value)} aria-invalid={Boolean(state.errors?.enrolledAt)} aria-describedby={state.errors?.enrolledAt ? "edit-kid-enrolled-at-error" : undefined} />
            </Field>
          </div>

          <Field label="SALA" htmlFor="edit-kid-room" error={state.errors?.roomId} errorId="edit-kid-room-error">
            <select id="edit-kid-room" name="roomId" className={inputClass(Boolean(state.errors?.roomId))} value={form.roomId} onChange={(event) => updateField("roomId", event.target.value)} aria-invalid={Boolean(state.errors?.roomId)} aria-describedby={state.errors?.roomId ? "edit-kid-room-error" : undefined}>
              <option value="">Seleccioná una sala</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </Field>

          <div>
            <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-ink-muted">ALERGIAS (ETIQUETAS)</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Alergias">
              {ALLERGY_TAGS.map((tag) => {
                const checked = selectedTags.includes(tag);

                return (
                  <label key={tag} className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" name="allergyTags" value={tag} checked={checked} onChange={() => toggleTag(tag)} />
                    <span className={`inline-flex rounded-full border-[1.5px] px-3.5 py-2 text-[12.5px] font-extrabold transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${checked ? "border-[#D9684A] bg-[#FBD8CC] text-[#A54331]" : "border-field-line bg-white text-ink-soft"}`}>{allergyLabels[tag]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Field label="NOTAS MÉDICAS" htmlFor="edit-kid-medical-notes">
            <textarea id="edit-kid-medical-notes" name="medicalNotes" className={`${inputClass(false)} min-h-[90px] resize-y leading-[1.5]`} value={form.medicalNotes} onChange={(event) => updateField("medicalNotes", event.target.value)} />
          </Field>

          {state.formError ? <p role="alert" className="rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-brand">{state.formError}</p> : null}
        </div>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, error, errorId, children }: { label: string; htmlFor: string; error?: string; errorId?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted">{label}</label>
      {children}
      {error ? <p id={errorId} role="alert" className="mt-1.5 text-[12px] font-bold text-[#B13A34]">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-[14px] border-[1.5px] ${hasError ? "border-[#D9583C]" : "border-field-line"} bg-white px-4 py-[13px] text-[15px] text-ink-strong focus:border-[#F2937A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`;
}
