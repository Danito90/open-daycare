"use client";

import Link from "next/link";
import { useState } from "react";
import type { Kid, Room } from "@/utils/kids/types";
import { allergyLabels, avatarColors, calculateAge, initialOf } from "@/utils/kids/format";
import { ArrowRightIcon, SearchIcon } from "../components/icons";
import { useKids } from "../components/kids-provider";

export function KidsList({ rooms, kids }: { rooms: Room[]; kids: Kid[] }) {
  const { getParents } = useKids();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredKids = normalizedQuery
    ? kids.filter((kid) => kid.fullName.toLocaleLowerCase().includes(normalizedQuery))
    : kids;
  const sections = rooms
    .map((room) => ({ room, kids: filteredKids.filter((kid) => kid.roomId === room.id) }))
    .filter((section) => section.kids.length > 0);

  return (
    <>
      <label className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-[#ECE0D0] bg-[#FFFDF9] px-4 py-3 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)]">
        <SearchIcon className="h-[18px] w-[18px] flex-none text-[#B0A290]" />
        <span className="sr-only">Buscar niño</span>
        <input className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#3F362E] outline-none placeholder:text-[#B6A99B]" placeholder="Buscar niño…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>

      {sections.length > 0 ? (
        <div className="flex flex-col gap-7">
          {sections.map(({ room, kids: roomKids }) => (
            <section key={room.id} aria-labelledby={`room-${room.id}`}>
              <div className="mb-3.5 flex items-center gap-3">
                <h2 id={`room-${room.id}`} className="m-0 text-[12.5px] font-extrabold uppercase tracking-[.8px] text-[#3F362E]">{room.name}</h2>
                <span className="text-[13px] text-[#A89A8B]">{roomKids.length} {roomKids.length === 1 ? "niño" : "niños"}</span>
                <span className="h-px flex-1 bg-[#E7DAC8]" />
              </div>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {roomKids.map((kid) => <KidCard key={kid.id} kid={kid} parentsCount={getParents(kid.id).length} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[#D8CBBA] bg-[#FFFDF9] px-5 py-10 text-center text-[14px] text-[#94887B]">
          {kids.length === 0 ? "Todavía no hay niños registrados." : "No encontramos niños con ese nombre."}
        </div>
      )}
    </>
  );
}

function KidCard({ kid, parentsCount }: { kid: Kid; parentsCount: number }) {
  const avatar = avatarColors(kid.id);

  return (
    <Link className="group flex min-w-0 items-center gap-3.5 rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition hover:-translate-y-0.5 hover:border-[#F2A78E]" href={`/kids/${kid.id}`}>
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[19px] font-semibold" style={{ backgroundColor: avatar.background, color: avatar.color }}>{initialOf(kid.fullName)}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-[family-name:var(--font-fredoka)] text-base font-semibold text-[#3F362E]">{kid.fullName}</div>
        <div className="text-[13px] text-[#A89A8B]">
          {calculateAge(kid.birthDate)} años · {parentsCount ? `${parentsCount} ${parentsCount === 1 ? "padre vinculado" : "padres vinculados"}` : "sin padres vinculados"}
        </div>
      </div>
      {kid.allergyTags.length > 0 ? (
        <span className="flex flex-none flex-col items-end gap-1">
          {kid.allergyTags.map((tag) => <span key={tag} className="rounded-full bg-[#FBD8CC] px-2.5 py-1.5 text-[11px] font-extrabold text-[#D9684A]">{allergyLabels[tag]}</span>)}
        </span>
      ) : (
        <ArrowRightIcon className="h-[18px] w-[18px] flex-none text-[#CBB89F]" />
      )}
    </Link>
  );
}
