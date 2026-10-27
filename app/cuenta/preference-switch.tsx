"use client";

import { useActionState, useId } from "react";
import { updatePreferences } from "@/app/actions/account";
import type { UpdatePreferencesState } from "@/utils/account/types";

const initialState: UpdatePreferencesState = {};

type PreferenceField = "notify_on_post" | "daily_summary_enabled";

type PreferenceSwitchProps = {
  label: string;
  description: string;
  field: PreferenceField;
  defaultChecked: boolean;
};

export function PreferenceSwitch({ label, description, field, defaultChecked }: PreferenceSwitchProps) {
  const [state, formAction, isPending] = useActionState(updatePreferences, initialState);
  const labelId = useId();
  const descriptionId = useId();

  return (
    <form action={formAction} aria-busy={isPending}>
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={defaultChecked ? "false" : "true"} />

      <div className="flex items-start justify-between gap-4 py-[13px]">
        <div className="min-w-0">
          <p id={labelId} className="text-[14.5px] font-extrabold text-ink-strong">{label}</p>
          <p id={descriptionId} className="mt-0.5 text-[12.5px] leading-[1.4] text-ink-soft">{description}</p>
          {state.formError ? <p role="alert" className="mt-2 text-xs font-bold text-[#B13A34]">{state.formError}</p> : null}
        </div>

        <button
          className="relative mt-0.5 inline-flex flex-none cursor-pointer items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
          type="submit"
          role="switch"
          aria-checked={defaultChecked}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          disabled={isPending}
        >
          <span className={`h-[26px] w-[46px] rounded-full transition-colors ${defaultChecked ? "bg-[#7FB894]" : "bg-[#D8CCBC]"}`} />
          <span className={`absolute left-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(63,54,46,.25)] transition-transform ${defaultChecked ? "translate-x-5" : ""}`} />
        </button>
      </div>
    </form>
  );
}
