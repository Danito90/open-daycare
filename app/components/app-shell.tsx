"use client";

import { useState } from "react";
import { BellIcon, CloseIcon, HomeIcon, LogoutIcon, MenuIcon, PeopleIcon, PlusIcon, SunIcon, UserIcon } from "./icons";

type NavigationKey = "feed" | "kids" | "notices" | "account";

const navigationItems = [
  { key: "feed" as const, label: "Feed", href: "/", Icon: HomeIcon },
  { key: "kids" as const, label: "Niños", href: "/kids", Icon: PeopleIcon },
  { key: "notices" as const, label: "Avisos", href: "#avisos", Icon: BellIcon },
  { key: "account" as const, label: "Mi cuenta", href: "#cuenta", Icon: UserIcon },
];

function Navigation({ active, onNavigate }: { active: NavigationKey; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Navegación principal">
      {navigationItems.map(({ key, label, href, Icon }) => (
        <a
          className={`flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] transition-colors ${
            key === active ? "bg-[#FBE3D8] font-extrabold text-[#D9583C]" : "font-semibold text-[#6E6359] hover:bg-[#F6ECDF]"
          }`}
          href={href}
          key={key}
          onClick={onNavigate}
        >
          <Icon className="h-[19px] w-[19px]" />
          {label}
        </a>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <a className="flex items-center gap-[11px] px-2 pb-[22px] pt-1" href="/">
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#F8C3A8] to-[#F2937A] text-white">
        <SunIcon className="h-[21px] w-[21px] stroke-[2.2]" />
      </span>
      <span>
        <strong className="block font-[family-name:var(--font-fredoka)] text-[17px] font-semibold leading-none text-[#3F362E]">OpenDayCare</strong>
        <small className="mt-0.5 block text-[11.5px] text-[#A89A8B]">Sala Soles</small>
      </span>
    </a>
  );
}

function Sidebar({ active }: { active: NavigationKey }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col border-r border-[#ECE0D0] bg-[#FFFDF9] p-6 pb-4 lg:flex">
      <Brand />
      <a className="mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-3 text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)]" href="#nueva-publicacion">
        <PlusIcon className="h-[17px] w-[17px] stroke-[2.4]" />
        Nueva publicación
      </a>
      <Navigation active={active} />
      <div className="mt-[10px] flex items-center gap-[11px] border-t border-[#ECE0D0] px-2 pb-1 pt-5">
        <div className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-[#F2937A] font-[family-name:var(--font-fredoka)] text-base font-semibold text-white">C</div>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-extrabold text-[#3F362E]">Caro Giménez</strong>
          <small className="block text-xs text-[#A89A8B]">Maestra · Soles</small>
        </div>
        <a className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-[#F6ECDF] text-[#94887B]" href="#cerrar-sesion" aria-label="Cerrar sesión">
          <LogoutIcon className="h-4 w-4" />
        </a>
      </div>
    </aside>
  );
}

export function AppShell({ active, children }: { active: NavigationKey; children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-[#F6ECDF]">
      <Sidebar active={active} />
      <button
        className="fixed left-[18px] top-[18px] z-20 flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border border-[#ECE0D0] bg-[#FFFDF9] text-[#D9583C] shadow-[0_5px_16px_-10px_rgba(120,90,60,.6)] lg:hidden"
        type="button"
        aria-label="Abrir menú"
        aria-controls="mobile-navigation"
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(true)}
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      {mobileMenuOpen && (
        <>
          <button className="fixed inset-0 z-30 h-full w-full cursor-default bg-[rgb(63_54_46/35%)]" type="button" aria-label="Cerrar menú" onClick={closeMobileMenu} />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(280px,82vw)] flex-col bg-[#FFFDF9] p-6 shadow-[10px_0_30px_-18px_rgba(63,54,46,.45)]" id="mobile-navigation" aria-label="Menú móvil">
            <div className="mb-6 flex items-center justify-between px-2 pt-1 font-[family-name:var(--font-fredoka)] text-[17px] text-[#3F362E]">
              <span>OpenDayCare</span>
              <button className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F6ECDF] text-[#94887B]" type="button" aria-label="Cerrar menú" onClick={closeMobileMenu}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <a className="mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-3 text-[14.5px] font-extrabold text-white" href="#nueva-publicacion" onClick={closeMobileMenu}>
              <PlusIcon className="h-[17px] w-[17px] stroke-[2.4]" />
              Nueva publicación
            </a>
            <Navigation active={active} onNavigate={closeMobileMenu} />
          </aside>
        </>
      )}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
