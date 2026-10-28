import "server-only";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { createClient } from "@/utils/supabase/server";

export async function hasOperationalAccess(userId: string): Promise<boolean> {
  const client = await createClient();
  const { data, error } = await client.from("staff_rooms").select("room_id").eq("staff_id", userId).limit(1);
  if (error) return false;
  return Boolean(data?.length);
}

export async function requireOperationalStaff() {
  const profile = await getCurrentProfile();
  if (profile?.role === "staff" && (!profile.userId || !(await hasOperationalAccess(profile.userId)))) {
    redirect("/cuenta");
  }
  return profile;
}
