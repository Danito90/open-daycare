"use client";

import { use } from "react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { ArrowLeftIcon, PlusIcon, SunIcon, WarningIcon } from "../../components/icons";
import { useKids } from "../../components/kids-provider";

export default function KidProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { kids } = useKids();
  const kid = kids.find((item) => item.id === id);

  if (!kid) {
    return (
      <AppShell active="kids">
        <div className="flex min-h-screen items-center justify-center px-[18px] pt-[76px] lg:px-10 lg:pt-[34px]">
          <div className="rounded-2xl border border-[#ECE0D0] bg-[#FFFDF9] p-8 text-center shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)]">
            <h1 className="font-[family-name:var(--font-fredoka)] text-2xl font-semibold text-[#3F362E]">Niño no encontrado</h1>
            <Link className="mt-4 inline-flex text-sm font-extrabold text-[#C5503A]" href="/kids">Volver a Niños</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="kids">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[820px]">
          <Link className="mb-5 flex items-center gap-1.5 text-sm font-bold text-[#94887B] hover:text-[#C5503A]" href="/kids"><ArrowLeftIcon className="h-[18px] w-[18px] stroke-[2.2]" />Volver a Niños</Link>
          <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
              <div className="flex flex-wrap items-center gap-[18px]">
                <div className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[34px] font-semibold" style={{ backgroundColor: kid.avatarBackground, color: kid.avatarColor }}>{kid.initial}</div>
                <div className="min-w-0 flex-1"><h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[28px] font-semibold text-[#3F362E]">{kid.name}</h1><p className="mt-1 text-[15px] text-[#94887B]">{kid.age} años · Sala {kid.room}</p></div>
                <a className="rounded-xl border-[1.5px] border-[#ECE0D0] bg-[#FFFDF9] px-4 py-2 text-sm font-bold text-[#6E6359]" href="#editar">Editar</a>
              </div>
              <div className="flex gap-3.5 rounded-2xl bg-[#FBDAD6] p-4 px-[18px]">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-[#F4A8A0] text-white"><WarningIcon className="h-[22px] w-[22px] stroke-[2.2]" /></div>
                <div><div className="mb-0.5 text-[15px] font-extrabold text-[#C5413A]">Alergias y notas</div><div className="text-[14.5px] leading-[1.5] text-[#B25249]">{kid.allergiesAndNotes}</div></div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#ECE0D0] bg-[#FFFDF9]">
                <InfoRow label="Fecha de nacimiento" value={kid.birthDate} />
                <InfoRow label="Sala" value={kid.room} />
                <InfoRow label="Ingreso" value={kid.enrollmentDate} last />
              </div>
            </div>
            <div className="flex w-full flex-none flex-col gap-3.5 lg:w-[300px]">
              <a className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#3F362E] p-[13px] text-[15px] font-extrabold text-white" href="#resumen"><SunIcon className="h-[18px] w-[18px]" />Resumen del día</a>
              <div className="rounded-2xl border border-[#ECE0D0] bg-[#FFFDF9] p-4 px-[18px]">
                <div className="mb-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">PADRES VINCULADOS</div>
                <div className="flex flex-col gap-3.5">
                  {kid.parents.map((parent) => <ParentRow key={parent.name} parent={parent} />)}
                  <a className="flex items-center gap-3 pt-2 text-[14.5px] font-extrabold text-[#C5503A]" href="#vincular"><span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]"><PlusIcon className="h-[18px] w-[18px] stroke-[2.2]" /></span>Vincular otro padre</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={`flex justify-between gap-4 px-[18px] py-[15px] text-[14.5px] ${last ? "" : "border-b border-[#F0E6D8]"}`}><span className="text-[#94887B]">{label}</span><span className="text-right font-extrabold text-[#3F362E]">{value}</span></div>;
}

function ParentRow({ parent }: { parent: { name: string; relationship: string; status: "active" | "pending"; initial: string; avatarBackground: string } }) {
  const pending = parent.status === "pending";
  return <div className="flex items-center gap-3"><div className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-base font-semibold text-white" style={{ backgroundColor: parent.avatarBackground }}>{parent.initial}</div><div className="min-w-0 flex-1"><div className="truncate text-[14.5px] font-extrabold text-[#3F362E]">{parent.name}</div><div className="text-[12.5px] text-[#A89A8B]">{parent.relationship} · {pending ? "invitación enviada" : "activa"}</div></div><span className={`flex-none rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${pending ? "bg-[#F7E7A6] text-[#9A7B1E]" : "bg-[#CFEBD8] text-[#3E9B6C]"}`}>{pending ? "PENDIENTE" : "ACTIVA"}</span></div>;
}
