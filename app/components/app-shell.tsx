"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { isStaffRole } from "@/utils/auth/roles";
import { daycareDisplayName } from "@/utils/auth/display";
import { CloseIcon, HomeIcon, LogoutIcon, MenuIcon, PeopleIcon, PlusIcon, SunIcon, UserIcon } from "./icons";
import { UserAvatar } from "./user-avatar";
import { useUser } from "./user-provider";

type NavigationKey = "feed" | "kids" | "resumen" | "account" | "personal";

const staffNavigation = [
  { key: "feed" as const, label: "Feed", href: "/", Icon: HomeIcon },
  { key: "kids" as const, label: "Niños", href: "/kids", Icon: PeopleIcon },
  { key: "account" as const, label: "Mi cuenta", href: "/cuenta", Icon: UserIcon },
];

const adminNavigation = [
  ...staffNavigation.slice(0, 2),
  { key: "personal" as const, label: "Personal", href: "/personal", Icon: PeopleIcon },
  staffNavigation[2],
];

const familyNavigation = [
  { key: "feed" as const, label: "Feed", href: "/", Icon: HomeIcon },
  { key: "resumen" as const, label: "Resumen del día", href: "/resumen", Icon: SunIcon },
  { key: "account" as const, label: "Mi cuenta", href: "/cuenta", Icon: UserIcon },
];

const accountNavigation = [staffNavigation[2]];

function Navigation({ active, onNavigate }: { active: NavigationKey; onNavigate?: () => void }) {
  const user = useUser();
  const navigationItems = user?.role === "admin" ? adminNavigation
    : user?.role === "staff" && !user.hasAssignedRooms ? accountNavigation
    : isStaffRole(user?.role) ? staffNavigation : familyNavigation;

  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Navegación principal">
      {navigationItems.map(({ key, label, href, Icon }) => (
        <Link
          aria-current={key === active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
            key === active ? "bg-[#FBE3D8] font-extrabold text-brand" : "font-semibold text-ink-soft hover:bg-[#F6ECDF]"
          }`}
          href={href}
          key={key}
          onClick={onNavigate}
        >
          <Icon className="h-[19px] w-[19px]" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  const user = useUser();
  const isStaff = isStaffRole(user?.role);
  const subtitle = isStaff ? daycareDisplayName(user?.daycareName) : "Familia";

  return (
    <Link className="flex items-center gap-[11px] px-2 pb-[22px] pt-1" href={user?.role === "staff" && !user.hasAssignedRooms ? "/cuenta" : "/"}>
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#F8C3A8] to-[#F2937A] text-ink">
        <SunIcon className="h-[21px] w-[21px] stroke-[2.2]" />
      </span>
      <span>
        <strong className="block font-[family-name:var(--font-fredoka)] text-[17px] font-semibold leading-none text-ink-strong">OpenDayCare</strong>
        {subtitle ? <small className="mt-0.5 block truncate text-[11.5px] text-ink-soft">{subtitle}</small> : null}
      </span>
    </Link>
  );
}

function CreatePublicationTrigger({ onClick }: { onClick: () => void }) {
  const className = "mb-[18px] flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-3 text-[14.5px] font-extrabold text-ink shadow-[0_8px_18px_-8px_rgba(238,129,100,.75)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

  return (
    <button className={className} type="button" onClick={onClick}>
      <PlusIcon className="h-[17px] w-[17px] stroke-[2.4]" />
      Nueva publicación
    </button>
  );
}

function UserBlock({ mobile = false }: { mobile?: boolean }) {
  const user = useUser();
  const fullName = user?.fullName?.trim() || "Usuario";
  const subtitle = user?.roleLabel?.trim() || "";

  return (
    <div className={`flex items-center gap-[11px] border-t border-[#ECE0D0] px-2 pb-1 pt-5 ${mobile ? "" : "mt-[10px]"}`}>
      <UserAvatar fullName={fullName} avatarUrl={user?.avatarUrl ?? null} />
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-extrabold text-ink-strong">{fullName}</strong>
        {subtitle ? <small className="block truncate text-xs text-ink-soft">{subtitle}</small> : null}
      </div>
      <form action={signOut} className="flex-none">
        <button className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F6ECDF] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="submit" aria-label="Cerrar sesión">
          <LogoutIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function Sidebar({ active, onNewPublication }: { active: NavigationKey; onNewPublication?: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col border-r border-[#ECE0D0] bg-[#FFFDF9] px-4 pb-4 pt-6 md:flex">
      <Brand />
      {onNewPublication ? <CreatePublicationTrigger onClick={onNewPublication} /> : null}
      <Navigation active={active} />
      <UserBlock />
    </aside>
  );
}

export function AppShell({ active, children, onNewPublication }: { active: NavigationKey; children: React.ReactNode; onNewPublication?: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = useUser();
  const canPublish = isStaffRole(user?.role) && user?.hasAssignedRooms !== false && Boolean(onNewPublication);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-[#F6ECDF]">
      <Sidebar active={active} onNewPublication={canPublish ? onNewPublication : undefined} />
      <button
        className="fixed left-[18px] top-[18px] z-20 flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border border-[#ECE0D0] bg-[#FFFDF9] text-brand shadow-[0_5px_16px_-10px_rgba(120,90,60,.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:hidden"
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
              <button className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F6ECDF] text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" type="button" aria-label="Cerrar menú" onClick={closeMobileMenu}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            {canPublish && onNewPublication ? (
              <div onClick={closeMobileMenu}><CreatePublicationTrigger onClick={onNewPublication} /></div>
            ) : null}
            <Navigation active={active} onNavigate={closeMobileMenu} />
            <UserBlock mobile />
          </aside>
        </>
      )}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
