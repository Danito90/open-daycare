import type { AccountChild, AccountDetails } from "@/utils/account/types";
import { createClient } from "@/utils/supabase/server";

type EmbeddedRoom = { name: string | null } | { name: string | null }[] | null;
type EmbeddedChild = {
  id: string;
  full_name: string;
  birth_date: string;
  photo_consent: boolean;
  rooms: EmbeddedRoom;
};

type LinkRow = { children: EmbeddedChild | EmbeddedChild[] | null };

type PreferencesRow = {
  notify_on_post: boolean | null;
  daily_summary_enabled: boolean | null;
};

function roomName(value: EmbeddedRoom) {
  if (!value) return "";
  if (Array.isArray(value)) return value[0]?.name?.trim() ?? "";

  return value.name?.trim() ?? "";
}

function toAccountChild(row: EmbeddedChild): AccountChild {
  return {
    id: row.id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    roomName: roomName(row.rooms),
    photoConsent: row.photo_consent,
  };
}

export async function getAccountDetails(userId: string): Promise<AccountDetails> {
  const supabase = await createClient();

  const [{ data: claimsData }, { data: preferences }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("users")
      .select("notify_on_post, daily_summary_enabled")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const email = claimsData?.claims?.email;

  const row = preferences as PreferencesRow | null;

  return {
    email: typeof email === "string" && email.trim() ? email.trim() : null,
    notifyOnPost: row?.notify_on_post ?? true,
    dailySummaryEnabled: row?.daily_summary_enabled ?? true,
  };
}

export async function getAccountChildren(): Promise<AccountChild[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("parent_children")
    .select("children(id, full_name, birth_date, photo_consent, rooms(name))");

  if (error || !data) return [];

  const children = (data as LinkRow[])
    .map((link) => (Array.isArray(link.children) ? link.children[0] : link.children))
    .filter((child): child is EmbeddedChild => Boolean(child))
    .map(toAccountChild);

  return children.sort((left, right) => left.fullName.localeCompare(right.fullName, "es"));
}
