"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginErrors = {
  email?: string;
  password?: string;
};

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${inverted ? "text-white" : "text-[#3F362E]"}`}>
      <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-[#FBE3D8] text-[#E0654A]">
        <svg className="h-[26px] w-[26px]" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <span className="font-[family-name:var(--font-fredoka)] text-[21px] font-semibold tracking-[.5px]">OpenDayCare</span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Ingresá tu email.";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Ingresá un email válido.";
    }
    if (!password) {
      nextErrors.password = "Ingresá tu contraseña.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      router.push("/");
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#FBF4EC] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)] px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-[60px] lg:py-14">
        <div className="absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-white/[.12]" />
        <div className="absolute -bottom-[110px] -left-[80px] h-[300px] w-[300px] rounded-full bg-white/[.10]" />
        <div className="relative">
          <BrandMark inverted />
        </div>
        <div className="relative mt-16 max-w-[430px] lg:mt-0">
          <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[34px] font-semibold leading-[1.12] sm:text-[42px]">
            El día de cada niño,<br />
            compartido con su familia.
          </h1>
          <p className="mt-[18px] max-w-[430px] text-[16px] leading-[1.6] text-white/[.92] sm:text-[17px]">
            Publicá momentos, gestioná las salas y mantené a las familias cerca, desde un solo lugar.
          </p>
        </div>
        <div className="relative mt-12 text-sm text-white/[.9]">Guardería Sala Soles</div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-10">
        <div className="w-full max-w-[392px]">
          <h2 className="m-0 font-[family-name:var(--font-fredoka)] text-[30px] font-semibold text-[#3F362E]">Iniciar sesión</h2>
          <p className="mb-7 mt-1.5 text-[15px] text-[#94887B]">Ingresá para ver el día de hoy.</p>

          <form onSubmit={handleSubmit} noValidate>
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

            <div className="mb-5 text-right">
              <button type="button" className="text-[13.5px] font-bold text-[#C5503A]">¿Olvidaste tu contraseña?</button>
            </div>
            <button type="submit" className="w-full rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-4 py-[15px] text-center text-base font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] transition hover:brightness-[.98]">
              Iniciar sesión
            </button>
          </form>

          <p className="mt-6 text-center text-[14.5px] text-[#94887B]">
            ¿Te invitó la guardería? <Link href="/activar-cuenta" className="font-extrabold text-[#C5503A]">Activá tu cuenta</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
