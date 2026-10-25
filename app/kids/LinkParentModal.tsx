"use client";

import { useActionState, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createInvitation } from "@/app/actions/invitations";
import { RELATIONSHIP_OPTIONS, type LinkParentState, type RelationshipType } from "@/utils/invitations/types";
import { CloseIcon, InfoIcon, SendIcon } from "../components/icons";

const initialState: LinkParentState = {};

type LinkParentModalProps = {
  childId: string;
  childName: string;
  onClose: () => void;
};

export function LinkParentModal({ childId, childName, onClose }: LinkParentModalProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createInvitation, initialState);
  const [code] = useState(generateInvitationCode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType | "">("");
  const errors = state.errors ?? {};
  const sent = state.sent;

  function handleClose() {
    if (sent) router.refresh();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-10" onMouseDown={handleBackdropClick}>
      <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]" role="dialog" aria-modal="true" aria-labelledby="link-parent-title">
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <h2 id="link-parent-title" className="font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">{sent ? "Invitación enviada" : "Vincular padre"}</h2>
            <p className="text-[13px] text-ink-soft">a {childName}</p>
          </div>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#F0E6D8] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" aria-label="Cerrar modal" onClick={handleClose}><CloseIcon className="h-[18px] w-[18px] stroke-[2.2]" /></button>
        </div>

        {sent ? (
          <div className="px-[26px] py-[22px]">
            <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E5F4E9] px-4 py-[13px] text-[#2F7A50]">
              <InfoIcon className="mt-px h-5 w-5 flex-none stroke-[2]" />
              <span className="text-[13.5px] leading-[1.45]">Le enviamos la invitación a <strong>{sent.email}</strong>. También podés compartirle este código.</span>
            </div>
            <div className="mb-5 rounded-2xl border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] p-[18px] text-center">
              <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#866A1E]">CÓDIGO DE INVITACIÓN</div>
              <div className="font-[family-name:var(--font-fredoka)] text-[34px] font-semibold tracking-[7px] text-[#826B31]" aria-label={`Código de invitación ${sent.code}`}>{sent.code}</div>
              <div className="mt-1.5 text-[13px] text-[#866A1E]">Vence en 7 días</div>
            </div>
            <button className="w-full rounded-[14px] bg-[#3F362E] px-4 py-3.5 text-[15.5px] font-extrabold text-white" type="button" onClick={handleClose}>Listo</button>
          </div>
        ) : (
          <form className="px-[26px] py-[22px]" action={formAction} aria-busy={isPending} noValidate>
            <input type="hidden" name="childId" value={childId} />
            <input type="hidden" name="relationship" value={relationship} />
            <input type="hidden" name="code" value={code} />

            <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px] text-[#3F5694]">
              <InfoIcon className="mt-px h-5 w-5 flex-none stroke-[2]" />
              <span className="text-[13.5px] leading-[1.45]">Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {childName}.</span>
            </div>

            <FieldLabel htmlFor="parent-name">NOMBRE DEL PADRE/MADRE</FieldLabel>
            <input id="parent-name" name="name" className={inputClass(Boolean(errors.name))} placeholder="Ej. Diego Fernández" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "parent-name-error" : undefined} />
            <FieldError id="parent-name-error" message={errors.name} />

            <FieldLabel htmlFor="parent-email">EMAIL</FieldLabel>
            <input id="parent-email" name="email" className={inputClass(Boolean(errors.email))} type="email" placeholder="correo@ejemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "parent-email-error" : undefined} />
            <FieldError id="parent-email-error" message={errors.email} />

            <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-ink-muted">PARENTESCO</div>
            <div className="mb-2 flex gap-[9px]" role="group" aria-label="Parentesco">
              {RELATIONSHIP_OPTIONS.map((option) => <button key={option.value} className={`flex-1 rounded-full border-[1.5px] px-2 py-[11px] text-[14px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${relationship === option.value ? "border-[#9FB8EC] bg-[#CCD8F4] text-[#3659AE]" : "border-[#ECE0D0] bg-[#FFFDF9] text-ink-soft"}`} type="button" aria-pressed={relationship === option.value} onClick={() => setRelationship(option.value)}>{option.label}</button>)}
            </div>
            <FieldError id="parent-relationship-error" message={errors.relationship} />
            {errors.code ? <p role="alert" className="mb-4 text-xs font-bold text-[#B13A34]">{errors.code}</p> : null}

            <div className="mb-5 rounded-2xl border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] p-[18px] text-center">
              <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#866A1E]">CÓDIGO DE INVITACIÓN</div>
              <div className="font-[family-name:var(--font-fredoka)] text-[34px] font-semibold tracking-[7px] text-[#826B31]" aria-label={`Código de invitación ${code}`}>{code}</div>
              <div className="mt-1.5 text-[13px] text-[#866A1E]">Vence en 7 días</div>
            </div>

            {state.formError ? (
              <p role="alert" className="mb-4 rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-brand">{state.formError}</p>
            ) : null}

            <button className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-4 py-3.5 text-[15.5px] font-extrabold text-ink shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isPending}><SendIcon className="h-[19px] w-[19px] stroke-[2]" />{isPending ? "Enviando…" : "Enviar invitación"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return <label className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted" htmlFor={htmlFor}>{children}</label>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="-mt-3 mb-4 text-xs font-bold text-[#B13A34]">{message}</p> : <div className="mb-[18px]" />;
}

function inputClass(hasError: boolean) {
  return `mb-[18px] w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink-strong transition placeholder:text-field-placeholder focus:border-[#F2937A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${hasError ? "border-[#C5413A]" : "border-field-line"}`;
}

function generateInvitationCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");
}
