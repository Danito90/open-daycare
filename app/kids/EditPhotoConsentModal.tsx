"use client";

import { useActionState, useEffect, useId, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { updatePhotoConsent } from "@/app/actions/kids";
import type { UpdatePhotoConsentState } from "@/utils/kids/types";
import { CloseIcon, InfoIcon } from "../components/icons";

const initialState: UpdatePhotoConsentState = {};

type EditPhotoConsentModalProps = {
  kidId: string;
  kidName: string;
  photoConsent: boolean;
  onClose: () => void;
};

export function EditPhotoConsentModal({ kidId, kidName, photoConsent, onClose }: EditPhotoConsentModalProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updatePhotoConsent, initialState);
  const [consent, setConsent] = useState(photoConsent);
  const titleId = useId();
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#3F362E]/35 px-4 py-10" onMouseDown={handleBackdropClick}>
      <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <h2 id={titleId} className="font-[family-name:var(--font-fredoka)] text-[18px] font-semibold text-[#3F362E]">Consentimiento de fotos</h2>
            <p className="text-[13px] text-[#A89A8B]">{kidName}</p>
          </div>
          <button className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#F0E6D8] text-[#94887B]" type="button" aria-label="Cerrar modal" onClick={onClose}><CloseIcon className="h-[18px] w-[18px] stroke-[2.2]" /></button>
        </div>

        <form className="px-[26px] py-[22px]" action={formAction} aria-busy={isPending} noValidate>
          <input type="hidden" name="childId" value={kidId} />
          <input type="hidden" name="photoConsent" value={consent ? "true" : "false"} />

          <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px] text-[#3F5694]">
            <InfoIcon className="mt-px h-5 w-5 flex-none stroke-[2]" />
            <span className="text-[13.5px] leading-[1.45]">Este permiso aplica a las fotos que la guardería comparte en la app. El cambio lo ven todos los tutores de {kidName}.</span>
          </div>

          <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-3.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-5 w-5 flex-none accent-[#5FB97E]"
              aria-invalid={Boolean(state.errors?.photoConsent)}
              aria-describedby={state.errors?.photoConsent ? errorId : undefined}
            />
            <span className="text-sm leading-[1.45] text-[#6E6359]">Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app.</span>
          </label>
          {state.errors?.photoConsent ? <p id={errorId} className="-mt-3 mb-4 text-xs font-bold text-[#C5413A]">{state.errors.photoConsent}</p> : null}

          {state.formError ? (
            <p role="alert" className="mb-4 rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-[#C5503A]">{state.formError}</p>
          ) : null}

          <div className="flex gap-3">
            <button className="flex-1 rounded-[14px] border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-3 text-[15px] font-extrabold text-[#6E6359]" type="button" onClick={onClose}>Cancelar</button>
            <button className="flex-1 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-4 py-3 text-[15px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={isPending}>{isPending ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
