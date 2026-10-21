import { safeNextPath } from "@/utils/auth/routes";
import { LoginForm } from "./login-form";

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

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = safeNextPath(next);

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
        <div aria-hidden="true" className="relative mt-12 h-5" />
      </section>

      <LoginForm nextPath={nextPath} />
    </main>
  );
}
