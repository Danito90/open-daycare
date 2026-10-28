import { getKids, getRooms } from "@/utils/kids/queries";
import { KidsView } from "./kids-view";
import { requireOperationalStaff } from "@/utils/staff/access";

export default async function KidsPage() {
  await requireOperationalStaff();
  const [rooms, kids] = await Promise.all([getRooms(), getKids()]);

  return <KidsView rooms={rooms} kids={kids} today={new Date().toISOString().slice(0, 10)} />;
}
