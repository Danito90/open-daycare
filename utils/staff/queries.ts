import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { StaffEntry, StaffInvitationSummary, StaffRoom } from "./types";

type RoomLink = { room_id: string };

export async function getStaffDirectory(daycareId: string): Promise<{ rooms: StaffRoom[]; entries: StaffEntry[] }> {
  const client = await createClient();
  const [roomsResult, membersResult, invitationsResult] = await Promise.all([
    client.from("rooms").select("id,name").eq("daycare_id", daycareId).order("name"),
    client.from("users").select("id,full_name,staff_rooms(room_id)").eq("daycare_id", daycareId).eq("role", "staff").eq("status", "active").order("full_name"),
    client.from("staff_invitations").select("id,full_name,email,status,expires_at,staff_invitation_rooms(room_id)")
      .eq("daycare_id", daycareId).in("status", ["pending", "expired"]).order("created_at", { ascending: false }),
  ]);

  if (roomsResult.error || membersResult.error || invitationsResult.error) {
    throw new Error("No pudimos cargar el equipo. Intentá de nuevo.");
  }

  const rooms = (roomsResult.data ?? []) as StaffRoom[];
  const entries: StaffEntry[] = [
    ...((membersResult.data ?? []) as { id: string; full_name: string; staff_rooms: RoomLink[] }[]).map((member) => ({
      id: member.id, name: member.full_name, email: null,
      rooms: (member.staff_rooms ?? []).map((link) => link.room_id), kind: "member" as const, status: "active" as const,
    })),
    ...((invitationsResult.data ?? []) as { id: string; full_name: string; email: string; status: string; expires_at: string; staff_invitation_rooms: RoomLink[] }[])
      .map((invitation) => ({
        id: invitation.id, name: invitation.full_name, email: invitation.email,
        rooms: (invitation.staff_invitation_rooms ?? []).map((link) => link.room_id),
        kind: "invitation" as const,
        status: (invitation.status === "pending" && Date.parse(invitation.expires_at) > Date.now()
          ? "pending" : "expired") as "pending" | "expired",
      })),
  ];

  return { rooms, entries };
}

const STAFF_CODE_PATTERN = /^[01][A-HJ-NP-Z2-9]{4}$/;

export async function getStaffInvitationSummary(code: string): Promise<StaffInvitationSummary | null> {
  if (!STAFF_CODE_PATTERN.test(code)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("staff_invitations")
    .select("id,expires_at,daycares(name),staff_invitation_rooms(rooms(name))")
    .eq("code", code).eq("status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error || !data) return null;
  const daycare = Array.isArray(data.daycares) ? data.daycares[0] : data.daycares;
  return {
    invitationId: data.id as string,
    daycareName: (daycare as { name: string } | null)?.name ?? "",
    rooms: ((data.staff_invitation_rooms ?? []) as { rooms: { name: string } | { name: string }[] | null }[])
      .map((link) => Array.isArray(link.rooms) ? link.rooms[0]?.name : link.rooms?.name).filter((name): name is string => !!name),
    expiresAt: data.expires_at as string,
  };
}
