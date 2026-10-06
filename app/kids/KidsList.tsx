"use client";

import { useState } from "react";
import { ArrowRightIcon, SearchIcon } from "../components/icons";
import { kids } from "../data/kids";

export function KidsList() {
  const [query, setQuery] = useState("");
  const filteredKids = kids.filter((kid) => kid.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  return (
    <>
      <label className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-[#ECE0D0] bg-[#FFFDF9] px-4 py-3 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)]">
        <SearchIcon className="h-[18px] w-[18px] flex-none text-[#B0A290]" />
        <span className="sr-only">Buscar niño</span>
        <input className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#3F362E] outline-none placeholder:text-[#B6A99B]" placeholder="Buscar niño…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="mb-3.5 flex items-center gap-3">
        <span className="text-[12.5px] font-extrabold tracking-[.8px] text-[#3F362E]">SALA SOLES</span>
        <span className="text-[13px] text-[#A89A8B]">{filteredKids.length} {filteredKids.length === 1 ? "niño" : "niños"}</span>
        <span className="h-px flex-1 bg-[#E7DAC8]" />
      </div>
      {filteredKids.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {filteredKids.map((kid) => (
            <a className="group flex min-w-0 items-center gap-3.5 rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition hover:-translate-y-0.5 hover:border-[#F2A78E]" href={`/kids/${kid.id}`} key={kid.id}>
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-[family-name:var(--font-fredoka)] text-[19px] font-semibold" style={{ backgroundColor: kid.avatarBackground, color: kid.avatarColor }}>{kid.initial}</div>
              <div className="min-w-0 flex-1">
                <div className="font-[family-name:var(--font-fredoka)] text-base font-semibold text-[#3F362E]">{kid.name}</div>
                <div className="text-[13px] text-[#A89A8B]">{kid.age} años · {kid.parents.length ? `${kid.parents.length} ${kid.parents.length === 1 ? "padre vinculado" : "padres vinculados"}` : "sin padres vinculados"}</div>
              </div>
              {kid.allergyLabel ? <span className={`flex-none rounded-full px-2.5 py-1.5 text-[11px] font-extrabold ${kid.allergyLabel === "VINCULAR" ? "bg-[#F9D2DE] text-[#C56486]" : kid.allergyLabel === "LACTOSA" ? "bg-[#FBD8CC] text-[#D9684A]" : "bg-[#FBD8CC] text-[#D9684A]"}`}>{kid.allergyLabel}</span> : <ArrowRightIcon className="h-[18px] w-[18px] flex-none text-[#CBB89F]" />}
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-[18px] border border-dashed border-[#D8CBBA] bg-[#FFFDF9] px-5 py-10 text-center text-[14px] text-[#94887B]">No encontramos niños con ese nombre.</div>
      )}
    </>
  );
}
