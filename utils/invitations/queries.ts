import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  isRelationshipType,
  type InvitationSummary,
  type LinkedParent,
  type RelationshipType,
} from "./types";

const CODE_PATTERN = /^[A-Z2-9]{5}$/;

type EmbeddedName = { full_name: string | null } | { full_name: string | null }[] | null;

type EmbeddedRoom = { name: string | null; daycares: EmbeddedDaycare } | { name: string | null; daycares: EmbeddedDaycare }[] | null;

type EmbeddedDaycare = { name: string | null } | { name: string | null }[] | null;

type EmbeddedChild =
  | { full_name: string | null; rooms: EmbeddedRoom }
  | { full_name: string | null; rooms: EmbeddedRoom }[]
  | null;

type InvitationRow = {
  id: string;
  full_name: string;
  relationship: string;
  expires_at: string;
};

type ParentLinkRow = {
  parent_id: string;
  relationship: string;
  users: EmbeddedName;
};

type SummaryRow = {
  id: string;
  expires_at: string;
  children: EmbeddedChild;
};

export type PendingInvitation = {
  id: string;
  childId: string;
  email: string;
  fullName: string;
  relationship: RelationshipType;
  status: "pending" | "accepted";
  expiresAt: string;
};

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;

  return value;
}

function relationshipOf(value: string): RelationshipType {
  return isRelationshipType(value) ? value : "guardian";
}

function userNameOf(value: EmbeddedName) {
  return firstItem(value)?.full_name?.trim() || "Tutor/a";
}

function childSummaryOf(value: EmbeddedChild) {
  const child = firstItem(value);
  const room = firstItem(child?.rooms ?? null);
  const daycare = firstItem(room?.daycares ?? null);

  return {
    childName: child?.full_name?.trim() || "",
    roomName: room?.name?.trim() || "",
    daycareName: daycare?.name?.trim() || "",
  };
}

export async function getKidParents(childId: string): Promise<LinkedParent[]> {
  const supabase = await createClient();

  const [linksResult, invitationsResult] = await Promise.all([
    supabase
      .from("parent_children")
      .select("parent_id, relationship, users(full_name)")
      .eq("child_id", childId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, full_name, relationship, expires_at")
      .eq("child_id", childId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
  ]);

  if (linksResult.error) throw new Error("No pudimos cargar los padres vinculados.");
  if (invitationsResult.error) throw new Error("No pudimos cargar las invitaciones.");

  const activeParents: LinkedParent[] = ((linksResult.data ?? []) as ParentLinkRow[]).map((row) => ({
    id: row.parent_id,
    name: userNameOf(row.users),
    relationship: relationshipOf(row.relationship),
    status: "active",
  }));

  const pendingParents: LinkedParent[] = ((invitationsResult.data ?? []) as InvitationRow[]).map((row) => ({
    id: row.id,
    name: row.full_name,
    relationship: relationshipOf(row.relationship),
    status: "pending",
  }));

  return [...activeParents, ...pendingParents];
}

export async function getInvitationSummary(code: string): Promise<InvitationSummary | null> {
  const normalizedCode = code.trim().toUpperCase();

  if (!CODE_PATTERN.test(normalizedCode)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, expires_at, children(full_name, rooms(name, daycares(name)))")
    .eq("code", normalizedCode)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  const row = data as SummaryRow;
  const child = childSummaryOf(row.children);

  if (!child.childName) return null;

  return {
    invitationId: row.id,
    childName: child.childName,
    roomName: child.roomName,
    daycareName: child.daycareName,
    expiresAt: row.expires_at,
  };
}

export async function getInvitationByCode(code: string): Promise<PendingInvitation | null> {
  const normalizedCode = code.trim().toUpperCase();

  if (!CODE_PATTERN.test(normalizedCode)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, child_id, email, full_name, relationship, status, expires_at")
    .eq("code", normalizedCode)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    child_id: string;
    email: string;
    full_name: string;
    relationship: string;
    status: "pending" | "accepted";
    expires_at: string;
  };

  return {
    id: row.id,
    childId: row.child_id,
    email: row.email,
    fullName: row.full_name,
    relationship: relationshipOf(row.relationship),
    status: row.status,
    expiresAt: row.expires_at,
  };
}
