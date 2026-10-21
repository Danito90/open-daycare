import type { UserProfile } from "@/utils/auth/types";
import { createClient } from "@/utils/supabase/server";

const ROLE_LABELS: Record<string, string> = {
  staff: "Personal",
  parent: "Familia",
  admin: "Admin",
};

type ProfileRow = {
  full_name: string | null;
  role: string | null;
  avatar_url?: string | null;
  daycare_id?: string | null;
};

type EmbeddedDaycare = { name: string | null } | { name: string | null }[] | null;

function normalizeDaycareName(value: EmbeddedDaycare) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.name ?? null;

  return value.name;
}

function toProfile(row: ProfileRow, daycareName: string | null): UserProfile {
  return {
    fullName: row.full_name?.trim() || "Usuario",
    roleLabel: row.role ? (ROLE_LABELS[row.role] ?? row.role) : "",
    daycareName,
    avatarUrl: row.avatar_url?.trim() || null,
  };
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims) return null;

    const claims = claimsData.claims;
    const userId = typeof claims.sub === "string" ? claims.sub : null;

    if (!userId) return null;

    const { data, error } = await supabase
      .from("users")
      .select("full_name, role, avatar_url, daycares(name)")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      const row = data as ProfileRow & { daycares: EmbeddedDaycare };

      return toProfile(row, normalizeDaycareName(row.daycares));
    }

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("users")
      .select("full_name, role, avatar_url, daycare_id")
      .eq("id", userId)
      .maybeSingle();

    if (fallbackError || !fallbackData) {
      return { fullName: "Usuario", roleLabel: "", daycareName: null, avatarUrl: null };
    }

    const row = fallbackData as ProfileRow;
    let daycareName: string | null = null;

    if (row.daycare_id) {
      const { data: daycareData } = await supabase
        .from("daycares")
        .select("name")
        .eq("id", row.daycare_id)
        .maybeSingle();

      if (daycareData) {
        daycareName = (daycareData as { name: string | null }).name;
      }
    }

    return toProfile(row, daycareName);
  } catch {
    return null;
  }
}
