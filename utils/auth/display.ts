export function daycareDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  return trimmed.replace(/^Guardería\s+/i, "").trim() || trimmed;
}
