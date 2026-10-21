import { notFound } from "next/navigation";
import { getKidById } from "@/utils/kids/queries";
import { KidProfile } from "./kid-profile";

export default async function KidProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kid = await getKidById(id);

  if (!kid) {
    notFound();
  }

  return <KidProfile kid={kid} />;
}
