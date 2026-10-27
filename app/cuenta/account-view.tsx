"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { AccountChild, AccountVariant } from "@/utils/account/types";
import { avatarColors, calculateAge, initialOf } from "@/utils/kids/format";
import { AppShell } from "../components/app-shell";
import { InfoIcon, LogoutIcon } from "../components/icons";
import { UserAvatar } from "../components/user-avatar";
import { ChildConsentSwitch } from "./child-consent-switch";
import { EditNameModal } from "./edit-name-modal";
import { PreferenceSwitch } from "./preference-switch";

type AccountViewProps = {
  variant: AccountVariant;
  fullName: string;
  email: string | null;
  subtitle: string;
  avatarUrl: string | null;
  notifyOnPost: boolean;
  dailySummaryEnabled: boolean;
  kids: AccountChild[];
};

function ageLabel(birthDate: string) {
  const age = calculateAge(birthDate);

  if (age <= 0) return "Menos de 1 año";

  return age === 1 ? "1 año" : `${age} años`;
}

export function AccountView({
  variant,
  fullName,
  email,
  subtitle,
  avatarUrl,
  notifyOnPost,
  dailySummaryEnabled,
  kids,
}: AccountViewProps) {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const isFamily = variant === "family";

  return (
    <AppShell active="account">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[720px]">
          <div className="mb-[22px]">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-brand">AJUSTES</div>
            <h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[30px] font-semibold text-ink-strong">Mi cuenta</h1>
          </div>

          <section className="mb-4 rounded-[22px] border border-[#ECE0D0] bg-[#FFFDF9] p-5 md:p-6" aria-labelledby="account-profile-title">
            <h2 id="account-profile-title" className="sr-only">Perfil</h2>
            <div className="flex items-center gap-4">
              <UserAvatar fullName={fullName} avatarUrl={avatarUrl} className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <strong className="block truncate font-[family-name:var(--font-fredoka)] text-[19px] font-semibold text-ink-strong">{fullName}</strong>
                <span className="block truncate text-[13.5px] text-ink-soft">{email ?? "—"}</span>
                {subtitle ? <span className="mt-1 block truncate text-[12px] font-extrabold tracking-[.4px] text-ink-muted">{subtitle}</span> : null}
              </div>
              <button
                className="flex-none rounded-full border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-2 text-[13.5px] font-extrabold text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                type="button"
                onClick={() => setIsEditNameOpen(true)}
              >
                Editar
              </button>
            </div>
          </section>

          {isFamily ? (
            <section className="mb-4 rounded-[22px] border border-[#ECE0D0] bg-[#FFFDF9] p-5 md:p-6" aria-labelledby="account-children-title">
              <h2 id="account-children-title" className="mb-3 text-[11.5px] font-extrabold tracking-[.8px] text-ink-muted">MIS HIJOS</h2>

              {kids.length ? (
                <ul className="flex flex-col divide-y divide-[#F0E6D8]">
                  {kids.map((child) => {
                    const avatar = avatarColors(child.id);

                    return (
                      <li key={child.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[17px] font-semibold"
                          style={{ backgroundColor: avatar.background, color: avatar.color }}
                        >
                          {initialOf(child.fullName)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[15px] font-extrabold text-ink-strong">{child.fullName}</strong>
                          <span className="block truncate text-[12.5px] text-ink-soft">
                            {ageLabel(child.birthDate)}
                            {child.roomName ? ` · ${child.roomName}` : ""}
                          </span>
                        </div>
                        <ChildConsentSwitch childId={child.id} childName={child.fullName} photoConsent={child.photoConsent} />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[13.5px] text-ink-soft">Todavía no tenés niños vinculados a tu cuenta.</p>
              )}
            </section>
          ) : null}

          <section className="mb-4 rounded-[22px] border border-[#ECE0D0] bg-[#FFFDF9] p-5 md:p-6" aria-labelledby="account-notifications-title">
            <h2 id="account-notifications-title" className="mb-3 text-[11.5px] font-extrabold tracking-[.8px] text-ink-muted">NOTIFICACIONES</h2>

            <div className="divide-y divide-[#F0E6D8]">
              <PreferenceSwitch
                label="Avisos cuando se publica algo"
                description="Novedades del día de tus hijos."
                field="notify_on_post"
                defaultChecked={notifyOnPost}
              />
              <PreferenceSwitch
                label="Resumen diario"
                description="Un resumen de lo que pasó en el día."
                field="daily_summary_enabled"
                defaultChecked={dailySummaryEnabled}
              />
            </div>

            <div className="mt-3 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px] text-[#3F5694]">
              <InfoIcon className="mt-px h-5 w-5 flex-none stroke-[2]" />
              <span className="text-[13px] leading-[1.45]">Todavía no enviamos avisos. Guardamos tus preferencias para cuando activemos los envíos.</span>
            </div>
          </section>

          <section className="rounded-[22px] border border-[#ECE0D0] bg-[#FFFDF9] p-5 md:p-6" aria-labelledby="account-access-title">
            <h2 id="account-access-title" className="mb-3 text-[11.5px] font-extrabold tracking-[.8px] text-ink-muted">ACCESO</h2>

            <Link
              className="flex items-center justify-between rounded-[14px] border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-3 text-[14.5px] font-extrabold text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href="/recuperar-contrasena"
            >
              Cambiar contraseña
              <span aria-hidden="true" className="text-ink-muted">→</span>
            </Link>

            <form action={signOut} className="mt-3">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-3 text-[14.5px] font-extrabold text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                type="submit"
              >
                <LogoutIcon className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </section>
        </div>
      </div>

      {isEditNameOpen ? <EditNameModal fullName={fullName} onClose={() => setIsEditNameOpen(false)} /> : null}
    </AppShell>
  );
}
