"use client";

import { useState } from "react";
import { AppShell } from "../components/app-shell";
import { PlusIcon } from "../components/icons";
import { AddKidModal } from "./AddKidModal";
import { KidsList } from "./KidsList";

export default function KidsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <AppShell active="kids">
      <div className="min-h-screen overflow-y-auto px-[18px] pb-12 pt-[76px] lg:px-10 lg:pb-20 lg:pt-[34px]">
        <div className="mx-auto w-full max-w-[880px]">
          <div className="mb-[22px] flex items-end justify-between gap-4">
            <div><div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-[#D9583C]">GESTIÓN</div><h1 className="m-0 font-[family-name:var(--font-fredoka)] text-[30px] font-semibold text-[#3F362E]">Niños</h1></div>
            <button type="button" className="flex items-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.7)]" onClick={() => setIsAddModalOpen(true)}><PlusIcon className="h-[17px] w-[17px] stroke-[2.4]" />Agregar niño</button>
          </div>
          <KidsList />
        </div>
      </div>
      {isAddModalOpen ? <AddKidModal onClose={() => setIsAddModalOpen(false)} /> : null}
    </AppShell>
  );
}
