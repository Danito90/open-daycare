"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { assignStaffRooms, inviteStaff } from "@/app/actions/staff";
import { AppShell } from "@/app/components/app-shell";
import type { StaffEntry, StaffFormState, StaffRoom } from "@/utils/staff/types";

const initial: StaffFormState = {};

function RoomChecks({ rooms, selected }: { rooms: StaffRoom[]; selected: string[] }) {
  const [checked, setChecked] = useState(selected);
  return <fieldset className="mt-4">
    <legend className="mb-2 text-sm font-bold text-ink-strong">Salas (opcional)</legend>
    <div className="flex flex-wrap gap-2">{rooms.map((room) => <label key={room.id} className="flex items-center gap-2 rounded-xl border border-[#ECE0D0] bg-white px-3 py-2 text-sm">
      <input type="checkbox" name="rooms" value={room.id} checked={checked.includes(room.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id))} />{room.name}
    </label>)}</div>
  </fieldset>;
}

function InviteForm({ rooms }: { rooms: StaffRoom[] }) {
  const [state, action, pending] = useActionState(inviteStaff, initial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();
  useEffect(() => { if (state.saved) router.refresh(); }, [state.saved, router]);
  return <form action={action} className="rounded-2xl border border-[#ECE0D0] bg-white p-5 shadow-sm" aria-busy={pending}>
    <h2 className="text-xl font-bold text-ink-strong">Invitar personal</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Nombre completo<input name="name" required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#D9C9B8] p-3" aria-describedby={state.errors?.name ? "name-error" : undefined} /></label>
      <label className="text-sm font-semibold">Email<input name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#D9C9B8] p-3" aria-describedby={state.errors?.email ? "email-error" : undefined} /></label>
    </div>
    {state.errors?.name && <p id="name-error" role="alert" className="text-sm text-brand">{state.errors.name}</p>}
    {state.errors?.email && <p id="email-error" role="alert" className="text-sm text-brand">{state.errors.email}</p>}
    <RoomChecks rooms={rooms} selected={[]} />
    {state.errors?.rooms && <p role="alert" className="text-sm text-brand">{state.errors.rooms}</p>}
    {state.formError && <p role="alert" className="mt-3 text-sm text-brand">{state.formError}</p>}
    {state.saved && <p role="status" className="mt-3 text-sm text-green-700">Invitación enviada.</p>}
    <button disabled={pending} className="mt-5 rounded-xl bg-[#EE8164] px-5 py-3 font-bold text-white disabled:opacity-50">{pending ? "Enviando..." : "Enviar invitación"}</button>
  </form>;
}

function MemberCard({ member, rooms }: { member: StaffEntry; rooms: StaffRoom[] }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(assignStaffRooms, initial);
  const router = useRouter();
  useEffect(() => { if (state.saved) router.refresh(); }, [state.saved, router]);
  const names = rooms.filter((room) => member.rooms.includes(room.id)).map((room) => room.name);
  return <li className="rounded-2xl border border-[#ECE0D0] bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-bold text-ink-strong">{member.name}</h3>{member.email && <p className="break-all text-sm text-ink-muted">{member.email}</p>}
        <p className="mt-1 text-sm text-ink-muted">{member.status === "active" ? "Activo" : member.status === "pending" ? "Pendiente" : "Vencida"} · {names.length ? names.join(", ") : "Sin salas asignadas"}</p></div>
      {member.status !== "expired" && <button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)} className="rounded-xl border border-[#D9C9B8] px-3 py-2 text-sm font-semibold">{editing ? "Cerrar" : "Cambiar salas"}</button>}
    </div>
    {editing && <form action={action} className="mt-4 border-t border-[#ECE0D0] pt-4" aria-busy={pending}>
      <input type="hidden" name="target" value={member.id} /><input type="hidden" name="kind" value={member.kind} />
      <RoomChecks key={member.rooms.join(",")} rooms={rooms} selected={member.rooms} />
      {state.formError && <p role="alert" className="mt-2 text-sm text-brand">{state.formError}</p>}
      {state.saved && <p role="status" className="mt-2 text-sm text-green-700">Salas actualizadas.</p>}
      <button disabled={pending} className="mt-4 rounded-xl bg-[#EE8164] px-4 py-2 font-bold text-white disabled:opacity-50">Guardar salas</button>
    </form>}
  </li>;
}

export function StaffView({ rooms, entries }: { rooms: StaffRoom[]; entries: StaffEntry[] }) {
  return <AppShell active="personal"><div className="mx-auto max-w-5xl px-5 pb-16 pt-20 md:px-10 md:pt-12">
    <h1 className="mb-6 text-3xl font-bold text-ink-strong">Personal</h1>
    <InviteForm rooms={rooms} />
    <h2 className="mb-4 mt-9 text-xl font-bold text-ink-strong">Equipo e invitaciones</h2>
    {entries.length ? <ul className="grid gap-3">{entries.map((member) => <MemberCard key={member.id} member={member} rooms={rooms} />)}</ul>
      : <p className="rounded-2xl border border-[#ECE0D0] bg-white p-5 text-ink-muted">Sin personal</p>}
  </div></AppShell>;
}
