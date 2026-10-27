"use client";

import { useState } from "react";
import type { Kid, Room } from "@/utils/kids/types";
import { AppShell } from "../components/app-shell";
import { PlusIcon } from "../components/icons";
import { AddKidModal } from "./AddKidModal";
import { KidsList } from "./KidsList";

type KidsViewProps = {
  rooms: Room[];
  kids: Kid[];
  today: string;
};

export function KidsView({ rooms, kids, today }: KidsViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <AppShell active="kids">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[880px]">
          <div className="mb-[22px] flex items-end justify-between gap-4">
            <div><div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-brand">GESTIÓN</div><h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[30px] font-semibold text-ink-strong">Niños</h1></div>
            <button type="button" className="flex items-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-[18px] py-[11px] text-[14.5px] font-extrabold text-ink shadow-[0_8px_18px_-8px_rgba(238,129,100,.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setIsAddModalOpen(true)}><PlusIcon className="h-[17px] w-[17px] stroke-[2.4]" />Agregar niño</button>
          </div>
          <KidsList rooms={rooms} kids={kids} />
        </div>
      </div>
      {isAddModalOpen ? <AddKidModal rooms={rooms} today={today} onClose={() => setIsAddModalOpen(false)} /> : null}
    </AppShell>
  );
}
