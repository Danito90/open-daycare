"use client";

import type { ParentFeedFilter, ParentFeedOptions } from "@/utils/posts/types";

type Props = {
  filter: ParentFeedFilter;
  options: ParentFeedOptions;
  onChange: (filter: ParentFeedFilter) => void;
};

export function ParentFeedSelector({ filter, options, onChange }: Props) {
  function toggle(kind: "childIds" | "roomIds" | "daycare", id?: string) {
    const selected = filter.scope === "selected"
      ? filter
      : { scope: "selected" as const, childIds: [], roomIds: [], daycare: false };
    const next = { ...selected, childIds: [...selected.childIds], roomIds: [...selected.roomIds] };

    if (kind === "daycare") {
      next.daycare = !next.daycare;
    } else if (id) {
      next[kind] = next[kind].includes(id)
        ? next[kind].filter((value) => value !== id)
        : [...next[kind], id];
    }

    onChange(next.childIds.length || next.roomIds.length || next.daycare ? next : { scope: "all" });
  }

  const choices = [
    { label: "Todas", checked: filter.scope === "all", change: () => onChange({ scope: "all" }) },
    ...options.children.map((child) => ({
      label: child.name,
      checked: filter.scope === "selected" && filter.childIds.includes(child.id),
      change: () => toggle("childIds", child.id),
    })),
    ...options.rooms.map((room) => ({
      label: /^sala\s/i.test(room.name) ? room.name : `Sala ${room.name}`,
      checked: filter.scope === "selected" && filter.roomIds.includes(room.id),
      change: () => toggle("roomIds", room.id),
    })),
    {
      label: "Guardería",
      checked: filter.scope === "selected" && filter.daycare,
      change: () => toggle("daycare"),
    },
  ];

  return (
    <fieldset className="mb-5 min-w-0 rounded-[18px] border border-[#ECE0D0] bg-[#FFFDF9] p-4">
      <legend className="px-1 text-[13px] font-bold text-ink-strong">Filtrar publicaciones</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice, index) => (
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${choice.checked ? "border-brand bg-[#FBE3D8] text-brand" : "border-[#E7DAC8] bg-white text-ink-muted"}`}
            key={`${index}-${choice.label}`}
          >
            <input
              checked={choice.checked}
              className="accent-[#AA4024]"
              onChange={choice.change}
              type="checkbox"
            />
            {choice.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
