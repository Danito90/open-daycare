"use client";

import { useState } from "react";
import Link from "next/link";
import { RELATIONSHIP_LABELS, type LinkedParent } from "@/utils/invitations/types";
import { avatarColors, calculateAge, formatAllergiesAndNotes, formatBirthDate, formatEnrollmentDate, initialOf } from "@/utils/kids/format";
import type { Kid } from "@/utils/kids/types";
import { AppShell } from "../../components/app-shell";
import { ArrowLeftIcon, PlusIcon, WarningIcon } from "../../components/icons";
import { EditPhotoConsentModal } from "../EditPhotoConsentModal";
import { LinkParentModal } from "../LinkParentModal";

export function KidProfile({ kid, parents }: { kid: Kid; parents: LinkedParent[] }) {
  const [isLinkParentModalOpen, setIsLinkParentModalOpen] = useState(false);
  const [isPhotoConsentModalOpen, setIsPhotoConsentModalOpen] = useState(false);
  const avatar = avatarColors(kid.id);

  return (
    <AppShell active="kids">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[820px]">
          <Link className="mb-5 flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="/kids"><ArrowLeftIcon className="h-[18px] w-[18px] stroke-[2.2]" />Volver a Niños</Link>
          <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              <div className="flex flex-wrap items-center gap-[18px]">
                <div className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[34px] font-semibold" style={{ backgroundColor: avatar.background, color: avatar.color }}>{initialOf(kid.fullName)}</div>
                <div className="min-w-0 flex-1"><h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[28px] font-semibold text-ink-strong">{kid.fullName}</h1><p className="mt-1 text-[15px] text-ink-muted">{calculateAge(kid.birthDate)} años · Sala {kid.roomName}</p></div>
                <button className="rounded-xl border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-2 text-sm font-bold text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" onClick={() => setIsPhotoConsentModalOpen(true)}>Editar</button>
              </div>
              <div className="flex gap-3.5 rounded-2xl bg-[#FBDAD6] p-4 px-[18px]">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-[#F4A8A0] text-[#7C2A24]"><WarningIcon className="h-[22px] w-[22px] stroke-[2.2]" /></div>
                <div><div className="mb-0.5 text-[15px] font-extrabold text-[#B13A34]">Alergias y notas</div><div className="text-[14.5px] leading-[1.5] text-[#9F4941]">{formatAllergiesAndNotes(kid)}</div></div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#ECE0D0] bg-[#FFFDF9]">
                <InfoRow label="Fecha de nacimiento" value={formatBirthDate(kid.birthDate)} />
                <InfoRow label="Sala" value={kid.roomName} />
                <InfoRow label="Ingreso" value={formatEnrollmentDate(kid.enrolledAt)} last />
              </div>
            </div>
            <div className="flex w-full flex-none flex-col gap-3.5 lg:w-[300px]">
              <div className="rounded-2xl border border-[#ECE0D0] bg-[#FFFDF9] p-4 px-[18px]">
                <div className="mb-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-ink-soft">PADRES VINCULADOS</div>
                <div className="flex flex-col gap-3.5">
                  {parents.map((parent) => <ParentRow key={parent.id} parent={parent} />)}
                  <button className="flex items-center gap-3 pt-2 text-left text-[14.5px] font-extrabold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" onClick={() => setIsLinkParentModalOpen(true)}><span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-ink-soft"><PlusIcon className="h-[18px] w-[18px] stroke-[2.2]" /></span>Vincular otro padre</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isLinkParentModalOpen ? <LinkParentModal childId={kid.id} childName={kid.fullName} onClose={() => setIsLinkParentModalOpen(false)} /> : null}
      {isPhotoConsentModalOpen ? <EditPhotoConsentModal kidId={kid.id} kidName={kid.fullName} photoConsent={kid.photoConsent} onClose={() => setIsPhotoConsentModalOpen(false)} /> : null}
    </AppShell>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={`flex justify-between gap-4 px-[18px] py-[15px] text-[14.5px] ${last ? "" : "border-b border-[#F0E6D8]"}`}><span className="text-ink-muted">{label}</span><span className="text-right font-extrabold text-ink-strong">{value}</span></div>;
}

function ParentRow({ parent }: { parent: LinkedParent }) {
  const pending = parent.status === "pending";
  const avatar = avatarColors(parent.id);

  return <div className="flex items-center gap-3"><div className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-base font-semibold" style={{ backgroundColor: avatar.background, color: avatar.color }}>{initialOf(parent.name)}</div><div className="min-w-0 flex-1"><div className="truncate text-[14.5px] font-extrabold text-ink-strong">{parent.name}</div><div className="text-[12.5px] text-ink-soft">{RELATIONSHIP_LABELS[parent.relationship]} · {pending ? "invitación enviada" : "activa"}</div></div><span className={`flex-none rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${pending ? "bg-[#F7E7A6] text-[#7D6418]" : "bg-[#CFEBD8] text-[#2D714F]"}`}>{pending ? "PENDIENTE" : "ACTIVA"}</span></div>;
}
