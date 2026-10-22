"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { activateInvitation } from "@/app/actions/invitations";
import { initialOf } from "@/utils/kids/format";
import type { ActivateAccountState, InvitationSummary } from "@/utils/invitations/types";

const initialState: ActivateAccountState = {};

type ActivateAccountFormProps = {
  initialCode: string;
  summary: InvitationSummary | null;
};

function BrandMark() {
  return (
    <span className="flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] text-white shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
      <svg className="h-[30px] w-[30px]" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </span>
  );
}

export function ActivateAccountForm({ initialCode, summary }: ActivateAccountFormProps) {
  const [state, formAction, isPending] = useActionState(activateInvitation, initialState);
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const errors = state.errors ?? {};

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-5 py-10 sm:px-10">
      <div className="w-full max-w-[440px]">
        <BrandMark />
        <h1 className="mt-[22px] font-[family-name:var(--font-fredoka)] text-[30px] font-semibold leading-[1.15] text-[#3F362E] sm:text-[32px]">Bienvenida a OpenDayCare</h1>
        <p className="mb-[26px] mt-2 text-[15.5px] leading-[1.55] text-[#94887B]">Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar la cuenta.</p>

        {summary ? (
          <div className="mb-[22px] flex items-center gap-3.5 rounded-2xl border-[1.5px] border-[#EADFD0] bg-white px-4 py-3.5">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#A9D9E8] font-[family-name:var(--font-fredoka)] text-[19px] font-semibold text-[#1F7A93]">{initialOf(summary.childName)}</div>
            <div className="min-w-0">
              <div className="text-[13px] text-[#94887B]">Te invitaron a seguir a</div>
              <div className="truncate font-[family-name:var(--font-fredoka)] text-[17px] font-semibold text-[#3F362E]">{summary.childName} · Sala {summary.roomName}</div>
              {summary.daycareName ? <div className="mt-0.5 truncate text-[12.5px] text-[#A89A8B]">{summary.daycareName}</div> : null}
            </div>
          </div>
        ) : (
          <div className="mb-[22px] rounded-2xl border-[1.5px] border-[#EADFD0] bg-white px-4 py-3.5 text-[13.5px] leading-[1.45] text-[#94887B]">
            Ingresá el código de cinco caracteres que recibiste por correo para ver a tu hijo.
          </div>
        )}

        <form action={formAction} aria-busy={isPending} noValidate>
          <label className="mb-2 block text-xs font-bold tracking-[.7px] text-[#94887B]" htmlFor="invitation-code">CÓDIGO DE INVITACIÓN</label>
          <input
            id="invitation-code"
            name="code"
            type="text"
            autoComplete="off"
            maxLength={5}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={errors.code ? "invitation-code-error" : undefined}
            className={`mb-1.5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 font-[family-name:var(--font-fredoka)] text-lg font-bold tracking-[3px] text-[#3F362E] outline-none transition focus:border-[#F2937A] ${errors.code ? "border-[#D9583C]" : "border-[#EADFD0]"}`}
          />
          {errors.code && <p id="invitation-code-error" className="mb-3 text-[13px] font-bold text-[#C5503A]">{errors.code}</p>}

          <label className="mb-2 block text-xs font-bold tracking-[.7px] text-[#94887B]" htmlFor="activation-email">EMAIL</label>
          <input
            id="activation-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "activation-email-error" : undefined}
            className={`mb-1.5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] text-[#3F362E] outline-none transition focus:border-[#F2937A] ${errors.email ? "border-[#D9583C]" : "border-[#EADFD0]"}`}
          />
          {errors.email && <p id="activation-email-error" className="mb-3 text-[13px] font-bold text-[#C5503A]">{errors.email}</p>}

          <label className="mb-2 block text-xs font-bold tracking-[.7px] text-[#94887B]" htmlFor="activation-password">CREAR CONTRASEÑA</label>
          <input
            id="activation-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "activation-password-error" : undefined}
            className={`mb-1.5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] text-[#3F362E] outline-none transition focus:border-[#F2937A] ${errors.password ? "border-[#D9583C]" : "border-[#EADFD0]"}`}
          />
          {errors.password && <p id="activation-password-error" className="mb-3 text-[13px] font-bold text-[#C5503A]">{errors.password}</p>}

          {state.formError ? (
            <p role="alert" className="mb-4 rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-[#C5503A]">{state.formError}</p>
          ) : null}

          <button type="submit" disabled={isPending} className="mt-4 w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-4 py-[15px] text-center text-base font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] transition hover:brightness-[.98] disabled:cursor-not-allowed disabled:opacity-70">
            {isPending ? "Activando…" : "Activar mi cuenta"}
          </button>
        </form>

        <p className="mt-[22px] text-center text-[14.5px] text-[#94887B]">
          ¿Ya tenés cuenta? <Link href="/login" className="font-extrabold text-[#C5503A]">Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
