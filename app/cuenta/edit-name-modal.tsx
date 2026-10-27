"use client";

import { useActionState, useEffect, useId, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/account";
import type { UpdateProfileState } from "@/utils/account/types";
import { CloseIcon } from "../components/icons";

const initialState: UpdateProfileState = {};

type EditNameModalProps = {
  fullName: string;
  onClose: () => void;
};

export function EditNameModal({ fullName, onClose }: EditNameModalProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const [name, setName] = useState(fullName);
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    if (state.saved) {
      router.refresh();
      onClose();
    }
  }, [state.saved, router, onClose]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const fieldError = state.errors?.fullName;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-10" onMouseDown={handleBackdropClick}>
      <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <h2 id={titleId} className="font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">Editar nombre</h2>
            <p className="text-[13px] text-ink-soft">Así te ven las demás personas en la app.</p>
          </div>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#F0E6D8] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" aria-label="Cerrar modal" onClick={onClose}>
            <CloseIcon className="h-[18px] w-[18px] stroke-[2.2]" />
          </button>
        </div>

        <form className="px-[26px] py-[22px]" action={formAction} aria-busy={isPending} noValidate>
          <label className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-muted" htmlFor={inputId}>
            NOMBRE COMPLETO
          </label>
          <input
            id={inputId}
            name="fullName"
            className={`mb-[18px] w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink-strong transition placeholder:text-field-placeholder focus:border-[#F2937A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${fieldError ? "border-[#C5413A]" : "border-field-line"}`}
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? errorId : undefined}
          />
          {fieldError ? <p id={errorId} role="alert" className="-mt-3 mb-4 text-xs font-bold text-[#B13A34]">{fieldError}</p> : null}

          {state.formError ? (
            <p role="alert" className="mb-4 rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-brand">{state.formError}</p>
          ) : null}

          <div className="flex gap-3">
            <button className="flex-1 rounded-[14px] border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-3 text-[15px] font-extrabold text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" onClick={onClose}>Cancelar</button>
            <button className="flex-1 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-4 py-3 text-[15px] font-extrabold text-ink shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isPending}>{isPending ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
