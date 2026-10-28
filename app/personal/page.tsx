import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { getStaffDirectory } from "@/utils/staff/queries";
import { StaffView } from "./staff-view";

export const metadata: Metadata = { title: "Personal · OpenDayCare" };

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || !profile.daycareId) redirect("/");
  const { rooms, entries } = await getStaffDirectory(profile.daycareId);
  return <StaffView rooms={rooms} entries={entries} />;
}
