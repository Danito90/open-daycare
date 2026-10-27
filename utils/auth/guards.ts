import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { isStaffRole, PANEL_HOME } from "@/utils/auth/roles";
import type { UserProfile } from "@/utils/auth/types";

export async function requireStaffAccess(): Promise<UserProfile> {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    redirect(PANEL_HOME);
  }

  return profile;
}

export async function requireFamilyAccess(): Promise<UserProfile> {
  const profile = await getCurrentProfile();

  if (!profile || isStaffRole(profile.role)) {
    redirect(PANEL_HOME);
  }

  return profile;
}
