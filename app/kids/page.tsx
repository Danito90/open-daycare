import { getKids, getRooms } from "@/utils/kids/queries";
import { KidsView } from "./kids-view";

export default async function KidsPage() {
  const [rooms, kids] = await Promise.all([getRooms(), getKids()]);

  return <KidsView rooms={rooms} kids={kids} today={new Date().toISOString().slice(0, 10)} />;
}
