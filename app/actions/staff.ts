"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { sendStaffInvitation } from "@/utils/email/send-staff-invitation";
import { isUuid } from "@/utils/kids/queries";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { StaffFormState } from "@/utils/staff/types";
import type { ActivateAccountState } from "@/utils/invitations/types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^[01][A-HJ-NP-Z2-9]{4}$/;

function parseRooms(formData: FormData): string[] | null {
  const rooms = formData.getAll("rooms");
  if (rooms.length > 100 || !rooms.every((item) => typeof item === "string" && isUuid(item))) return null;
  const unique = [...new Set(rooms as string[])];
  return unique.length === rooms.length ? unique : null;
}

function newCode() {
  return String(randomInt(2)) + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

async function appUrl() {
  if (process.env.APP_URL?.trim()) return process.env.APP_URL.trim();
  if (process.env.NODE_ENV === "production") return null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : null;
}

export async function inviteStaff(_state: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rooms = parseRooms(formData);
  const errors: NonNullable<StaffFormState["errors"]> = {};
  if (!name) errors.name = "Ingresá el nombre del miembro.";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Ingresá un email válido.";
  if (!rooms) errors.rooms = "Seleccioná salas válidas.";
  if (Object.keys(errors).length) return { errors };

  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" || !profile.daycareId) return { formError: "No tenés permiso para invitar personal." };
  const url = await appUrl();
  if (!url) return { formError: "Falta configurar APP_URL para enviar la invitación." };
  const client = await createClient();
  let invitationId: string | null = null;
  let code = "";

  for (let attempt = 0; attempt < 5; attempt++) {
    code = newCode();
    const { data, error } = await client.rpc("create_staff_invitation", {
      p_name: name, p_email: email, p_code: code, p_room_ids: rooms!,
    });
    if (!error) { invitationId = data as string; break; }
    if (error.message.includes("email_in_use") || error.message.includes("staff_invitations_pending_email_idx")) {
      return { errors: { email: "Ya existe una cuenta o una invitación pendiente para este email." } };
    }
    if (error.message.includes("invalid_rooms")) return { errors: { rooms: "Seleccioná salas de tu guardería." } };
    if (!error.message.includes("staff_invitations_code_unique_idx")) {
      return { formError: "No pudimos guardar la invitación. Intentá de nuevo." };
    }
  }
  if (!invitationId) return { formError: "No pudimos generar un código único. Intentá de nuevo." };

  try {
    await sendStaffInvitation({ to: email, name, daycare: profile.daycareName ?? "tu guardería", code,
      appUrl: url, invitationId });
  } catch {
    const { error } = await client.rpc("cancel_unsent_staff_invitation", { p_invitation_id: invitationId });
    return { formError: error
      ? "No pudimos confirmar el envío. Contactá a soporte antes de reintentar."
      : "No pudimos enviar el correo. Revisá la dirección e intentá de nuevo." };
  }

  revalidatePath("/personal");
  return { saved: true };
}

export async function assignStaffRooms(_state: StaffFormState, formData: FormData): Promise<StaffFormState> {
  const target = String(formData.get("target") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const rooms = parseRooms(formData);
  if (!isUuid(target) || (kind !== "member" && kind !== "invitation") || !rooms) {
    return { formError: "La asignación no es válida." };
  }
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") return { formError: "No tenés permiso para cambiar salas." };
  const client = await createClient();
  const { error } = await client.rpc("replace_staff_rooms", {
    p_target_id: target, p_invitation: kind === "invitation", p_room_ids: rooms,
  });
  if (error) return { formError: "No pudimos cambiar las salas. Revisá que pertenezcan a tu guardería." };
  revalidatePath("/personal");
  revalidatePath("/");
  revalidatePath("/kids");
  return { saved: true };
}

export async function activateStaffInvitation(_state: ActivateAccountState, formData: FormData): Promise<ActivateAccountState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!CODE_PATTERN.test(code)) return { errors: { code: "El código de invitación no es válido." } };
  if (!EMAIL_PATTERN.test(email)) return { errors: { email: "Ingresá un email válido." } };
  if (password.length < 8) return { errors: { password: "La contraseña debe tener al menos 8 caracteres." } };

  const admin = createAdminClient();
  const { data: invitation, error: lookupError } = await admin.from("staff_invitations")
    .select("id,email,status,expires_at").eq("code", code).maybeSingle();
  if (lookupError) return { formError: "No pudimos verificar la invitación." };
  if (!invitation || invitation.status !== "pending" || Date.parse(invitation.expires_at) <= Date.now()) {
    return { errors: { code: "Esta invitación no está disponible o ya venció." } };
  }
  if (invitation.email !== email) return { errors: { email: "El email no coincide con la invitación." } };

  const { data, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !data.user) {
    return { errors: { email: createError?.code === "email_exists" ? "Ya existe una cuenta con este email." : "No pudimos crear la cuenta." } };
  }
  const { data: roomCount, error: acceptError } = await admin.rpc("accept_staff_invitation", {
    p_invitation_id: invitation.id, p_user_id: data.user.id,
  });
  if (acceptError) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    return { formError: deleteError
      ? "No pudimos completar la activación ni limpiar la cuenta incompleta. Contactá a soporte."
      : "No pudimos completar la activación. Intentá de nuevo." };
  }

  const client = await createClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) return { formError: "La cuenta ya está activa. Iniciá sesión con tu email y contraseña." };
  revalidatePath("/", "layout");
  redirect(Number(roomCount) > 0 ? "/" : "/cuenta");
}
