import { createClient } from "@/utils/supabase/server";
import { isAllergyTag, type Kid, type Room } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KID_COLUMNS = "id, full_name, birth_date, enrolled_at, room_id, medical_notes, allergy_tags, rooms(id, name)";

type EmbeddedRoom = { name: string } | { name: string }[] | null;

type RoomRow = {
  id: string;
  name: string;
};

type KidRow = {
  id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  room_id: string;
  medical_notes: string | null;
  allergy_tags: string[] | null;
  rooms: EmbeddedRoom;
};

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeRoomName(value: EmbeddedRoom) {
  if (!value) return "";
  if (Array.isArray(value)) return value[0]?.name ?? "";

  return value.name;
}

function toKid(row: KidRow): Kid {
  return {
    id: row.id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    enrolledAt: row.enrolled_at,
    roomId: row.room_id,
    roomName: normalizeRoomName(row.rooms),
    allergyTags: (row.allergy_tags ?? []).filter(isAllergyTag),
    medicalNotes: row.medical_notes?.trim() || null,
  };
}

export async function getRooms(): Promise<Room[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("rooms").select("id, name").order("name");

  if (error) throw new Error("No pudimos cargar las salas.");

  return ((data ?? []) as RoomRow[]).map((room) => ({ id: room.id, name: room.name }));
}

export async function getKids(): Promise<Kid[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("children").select(KID_COLUMNS).order("full_name");

  if (error) throw new Error("No pudimos cargar los niños.");

  return ((data ?? []) as KidRow[]).map(toKid);
}

export async function getKidById(id: string): Promise<Kid | null> {
  if (!isUuid(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("children").select(KID_COLUMNS).eq("id", id).maybeSingle();

  if (error) throw new Error("No pudimos cargar el perfil del niño.");

  return data ? toKid(data as KidRow) : null;
}
