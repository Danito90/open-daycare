"use client";

import { useActionState, useId } from "react";
import { updatePhotoConsent } from "@/app/actions/kids";
import type { UpdatePhotoConsentState } from "@/utils/kids/types";

const initialState: UpdatePhotoConsentState = {};

type ChildConsentSwitchProps = {
  childId: string;
  childName: string;
  photoConsent: boolean;
};

export function ChildConsentSwitch({ childId, childName, photoConsent }: ChildConsentSwitchProps) {
  const [state, formAction, isPending] = useActionState(updatePhotoConsent, initialState);
  const descriptionId = useId();
  const error = state.formError ?? state.errors?.photoConsent;

  return (
    <form action={formAction} aria-busy={isPending}>
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="photoConsent" value={photoConsent ? "false" : "true"} />

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-extrabold tracking-[.5px] text-ink-muted">FOTOS</span>
          <button
            className="relative inline-flex cursor-pointer items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
            type="submit"
            role="switch"
            aria-checked={photoConsent}
            aria-label={`Consentimiento de fotos de ${childName}`}
            aria-describedby={descriptionId}
            disabled={isPending}
          >
            <span className={`h-[26px] w-[46px] rounded-full transition-colors ${photoConsent ? "bg-[#7FB894]" : "bg-[#D8CCBC]"}`} />
            <span className={`absolute left-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(63,54,46,.25)] transition-transform ${photoConsent ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <span id={descriptionId} className="sr-only">Autorizás que la guardería comparta fotos de {childName} en la app.</span>
        {error ? <p role="alert" className="max-w-[190px] text-right text-[11.5px] font-bold text-[#B13A34]">{error}</p> : null}
      </div>
    </form>
  );
}
