"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { CloseIcon, InfoIcon, SendIcon } from "../components/icons";
import type { LinkParentForm } from "../components/kids-provider";

type LinkParentModalProps = {
  childName: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (form: LinkParentForm) => void;
};

type FormErrors = Partial<Record<keyof LinkParentForm, string>>;

const relationships: LinkParentForm["relationship"][] = ["Mamá", "Papá", "Tutor/a"];

export function LinkParentModal({ childName, open, onClose, onSubmit }: LinkParentModalProps) {
  const [form, setForm] = useState<LinkParentForm>({ name: "", email: "", relationship: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", relationship: "" });
      setErrors({});
      setCode(generateInvitationCode());
    }
  }, [open]);

  if (!open) return null;

  function updateField(field: keyof LinkParentForm, value: string) {
    setForm((current) => ({ ...current, [field]: value } as LinkParentForm));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-10" onMouseDown={handleBackdropClick}>
      <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]" role="dialog" aria-modal="true" aria-labelledby="link-parent-title">
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <h2 id="link-parent-title" className="font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">Vincular padre</h2>
            <p className="text-[13px] text-[#A89A8B]">a {childName}</p>
          </div>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#F0E6D8] text-[#94887B]" type="button" aria-label="Cerrar modal" onClick={onClose}><CloseIcon className="h-[18px] w-[18px] stroke-[2.2]" /></button>
        </div>
        <form className="px-[26px] py-[22px]" onSubmit={handleSubmit} noValidate>
          <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px] text-[#3F5694]">
            <InfoIcon className="mt-px h-5 w-5 flex-none stroke-[2]" />
            <span className="text-[13.5px] leading-[1.45]">Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {childName}.</span>
          </div>

          <FieldLabel htmlFor="parent-name">NOMBRE DEL PADRE/MADRE</FieldLabel>
          <input id="parent-name" className={inputClass(Boolean(errors.name))} placeholder="Ej. Diego Fernández" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          <FieldError message={errors.name} />

          <FieldLabel htmlFor="parent-email">EMAIL</FieldLabel>
          <input id="parent-email" className={inputClass(Boolean(errors.email))} type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          <FieldError message={errors.email} />

          <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#94887B]">PARENTESCO</div>
          <div className="mb-5 flex gap-[9px]" role="group" aria-label="Parentesco">
            {relationships.map((relationship) => <button key={relationship} className={`flex-1 rounded-full border-[1.5px] px-2 py-[11px] text-[14px] font-extrabold ${form.relationship === relationship ? "border-[#9FB8EC] bg-[#CCD8F4] text-[#4E72C8]" : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"}`} type="button" onClick={() => updateField("relationship", relationship)}>{relationship}</button>)}
          </div>
          <FieldError message={errors.relationship} />

          <div className="mb-5 rounded-2xl border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] p-[18px] text-center">
            <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#A88526]">CÓDIGO DE INVITACIÓN</div>
            <div className="font-[family-name:var(--font-fredoka)] text-[34px] font-semibold tracking-[7px] text-[#8A7234]" aria-label={`Código de invitación ${code}`}>{code}</div>
            <div className="mt-1.5 text-[13px] text-[#A88526]">Vence en 7 días</div>
          </div>

          <button className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-4 py-3.5 text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]" type="submit"><SendIcon className="h-[19px] w-[19px] stroke-[2]" />Enviar invitación</button>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return <label className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-[#94887B]" htmlFor={htmlFor}>{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="-mt-3 mb-4 text-xs font-bold text-[#C5413A]">{message}</p> : <div className="mb-[18px]" />;
}

function inputClass(hasError: boolean) {
  return `mb-[18px] w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-[#3F362E] outline-none placeholder:text-[#B6A99B] ${hasError ? "border-[#C5413A]" : "border-[#EADFD0]"}`;
}

function validate(form: LinkParentForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Escribe el nombre del padre o madre.";
  if (!form.email.trim()) errors.email = "Escribe un email.";
  else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Escribe un email válido.";
  if (!form.relationship) errors.relationship = "Selecciona un parentesco.";
  return errors;
}

function generateInvitationCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");
}
