import { notFound } from "next/navigation";
import { getKidParents } from "@/utils/invitations/queries";
import { getKidById, isUuid } from "@/utils/kids/queries";
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

  const parents = await getKidParents(id);

  return <KidProfile kid={kid} parents={parents} />;
}
