"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import type { RequestResetState } from "./types";

const initialState: RequestResetState = {};

function BrandMark() {
  return (
    <span className="flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] text-[#2E2A26] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
      <svg className="h-[30px] w-[30px]" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </span>
  );
}

export function RequestResetForm({ initialEmail }: { initialEmail: string }) {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
  const error = state.errors?.email;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-5 py-10 sm:px-10">
      <div className="w-full max-w-[440px]">
        <BrandMark />
        <h1 className="mt-[22px] font-[family-name:var(--font-fredoka)] text-[30px] font-semibold leading-[1.15] text-ink-strong sm:text-[32px]">Recuperá tu contraseña</h1>
        <p className="mb-[26px] mt-2 text-[15.5px] leading-[1.55] text-ink-muted">Ingresá el email de tu cuenta y te enviamos un enlace para crear una contraseña nueva.</p>

        {state.sent ? (
          <p role="status" className="mb-[22px] rounded-[14px] bg-[#E5F4E9] px-4 py-[13px] text-[13.5px] font-bold leading-[1.45] text-[#2F7A50]">
            Si ese email tiene una cuenta, te enviamos el enlace. Revisá también la carpeta de spam.
          </p>
        ) : null}

        <form action={formAction} aria-busy={isPending} noValidate>
          <label className="mb-2 block text-xs font-bold tracking-[.7px] text-ink-muted" htmlFor="reset-email">EMAIL</label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={initialEmail}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "reset-email-error" : undefined}
            className={`mb-1.5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] text-ink-strong transition focus:border-[#F2937A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${error ? "border-[#D9583C]" : "border-field-line"}`}
          />
          {error ? <p id="reset-email-error" role="alert" className="mb-3 text-[13px] font-bold text-brand">{error}</p> : null}

          {state.formError ? (
            <p role="alert" className="mb-4 rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-brand">{state.formError}</p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-4 py-[15px] text-center text-base font-extrabold text-ink shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] transition hover:brightness-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Enviando…" : "Enviarme el enlace"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14.5px] text-ink-muted">
          <Link className="font-extrabold text-brand underline underline-offset-2" href="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
