import { notFound } from "next/navigation";
import { getKidParents } from "@/utils/invitations/queries";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { isStaffRole } from "@/utils/auth/roles";
import { getKidById, getRooms, isUuid } from "@/utils/kids/queries";
import { KidProfile } from "./kid-profile";

export default async function KidProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const kid = await getKidById(id);

  if (!kid) {
    notFound();
  }

  const profile = await getCurrentProfile();
  const canEdit = isStaffRole(profile?.role);
  const [parents, rooms] = await Promise.all([getKidParents(id), canEdit ? getRooms() : Promise.resolve([])]);

  return <KidProfile kid={kid} parents={parents} rooms={rooms} canEdit={canEdit} today={new Date().toISOString().slice(0, 10)} />;
}
