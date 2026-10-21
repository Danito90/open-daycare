"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn } from "@/app/actions/auth";
import type { LoginState } from "./types";

const initialState: LoginState = {};

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const errors = state.errors ?? {};

  return (
    <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-10">
      <div className="w-full max-w-[392px]">
        <h2 className="m-0 font-[family-name:var(--font-fredoka)] text-[30px] font-semibold text-[#3F362E]">Iniciar sesión</h2>
        <p className="mb-7 mt-1.5 text-[15px] text-[#94887B]">Ingresá para ver el día de hoy.</p>

        <form action={formAction} aria-busy={isPending} noValidate>
          <input type="hidden" name="next" value={nextPath} />

          <label className="mb-2 block text-xs font-bold tracking-[.7px] text-[#94887B]" htmlFor="login-email">EMAIL</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className={`mb-1.5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] text-[#3F362E] outline-none transition focus:border-[#F2937A] ${errors.email ? "border-[#D9583C]" : "border-[#EADFD0]"}`}
          />
          {errors.email && <p id="login-email-error" className="mb-3 text-[13px] font-bold text-[#C5503A]">{errors.email}</p>}

          <label className="mb-2 block text-xs font-bold tracking-[.7px] text-[#94887B]" htmlFor="login-password">CONTRASEÑA</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            className={`mb-1.5 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] text-[#3F362E] outline-none transition focus:border-[#F2937A] ${errors.password ? "border-[#D9583C]" : "border-[#EADFD0]"}`}
          />
          {errors.password && <p id="login-password-error" className="mb-3 text-[13px] font-bold text-[#C5503A]">{errors.password}</p>}

          {state.formError && (
            <p id="login-form-error" role="alert" className="mb-4 rounded-[12px] bg-[#FBE3D8] px-3.5 py-3 text-[13px] font-bold text-[#C5503A]">
              {state.formError}
            </p>
          )}

          <div className="mb-5 text-right">
            <button type="button" className="text-[13.5px] font-bold text-[#C5503A]">¿Olvidaste tu contraseña?</button>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-4 py-[15px] text-center text-base font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] transition hover:brightness-[.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14.5px] text-[#94887B]">
          ¿Te invitó la guardería? <Link href="/activar-cuenta" className="font-extrabold text-[#C5503A]">Activá tu cuenta</Link>
        </p>
      </div>
    </section>
  );
}
