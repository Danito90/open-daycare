"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/utils/auth/roles";
import { sendInvitationEmail } from "@/utils/email/send-invitation";
import {
  isRelationshipType,
  type ActivateAccountState,
  type LinkParentState,
} from "@/utils/invitations/types";
import { getInvitationByCode } from "@/utils/invitations/queries";
import { isUuid } from "@/utils/kids/queries";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { hasOperationalAccess } from "@/utils/staff/access";

const CODE_PATTERN = /^[A-Z2-9]{5}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_DAYS = 7;

type StaffProfile = { role: string | null };

type ChildContactRow = {
  full_name: string;
  rooms: EmbeddedRoom;
};

type EmbeddedRoom = { name: string | null; daycares: EmbeddedDaycare } | { name: string | null; daycares: EmbeddedDaycare }[] | null;

type EmbeddedDaycare = { name: string | null } | { name: string | null }[] | null;

function firstItem<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;

  return value;
}

function generateCode() {
  return Array.from(
    { length: 5 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");
}

async function resolveAppUrl() {
  const configured = process.env.APP_URL?.trim();

  if (configured) return configured;

  if (process.env.NODE_ENV === "production") return null;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : null;
}

export async function createInvitation(
  _previousState: LinkParentState,
  formData: FormData,
): Promise<LinkParentState> {
  const childId = String(formData.get("childId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const relationship = String(formData.get("relationship") ?? "");
  const code = String(formData.get("code") ?? "");

  const errors: NonNullable<LinkParentState["errors"]> = {};

  if (!isUuid(childId)) {
    return { formError: "No pudimos identificar al niño. Recargá la página e intentá de nuevo." };
  }

  if (!name) {
    errors.name = "Escribí el nombre del padre o madre.";
  }

  if (!email) {
    errors.email = "Escribí un email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Escribí un email válido.";
  }

  if (!relationship) {
    errors.relationship = "Seleccioná un parentesco.";
  } else if (!isRelationshipType(relationship)) {
    errors.relationship = "Seleccioná un parentesco válido.";
  }

  if (!CODE_PATTERN.test(code)) {
    errors.code = "El código de invitación no es válido.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();

  let userId: string | null = null;

  try {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims) {
      return { formError: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
    }

    userId = typeof claimsData.claims.sub === "string" ? claimsData.claims.sub : null;
  } catch {
    return { formError: "No pudimos verificar tu sesión. Intentá de nuevo." };
  }

  if (!userId) {
    return { formError: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { formError: "No pudimos verificar tu perfil. Intentá de nuevo." };
  }

  const role = (profile as StaffProfile | null)?.role;

  if (!isStaffRole(role)) {
    return { formError: "Tu perfil no tiene permiso para invitar padres." };
  }
  if (role === "staff" && !(await hasOperationalAccess(userId))) {
    return { formError: "Tu perfil no tiene salas asignadas para invitar padres." };
  }

  const { data: childData, error: childError } = await supabase
    .from("children")
    .select("full_name, rooms(name, daycares(name))")
    .eq("id", childId)
    .maybeSingle();

  if (childError) {
    return { formError: "No pudimos cargar los datos del niño. Intentá de nuevo." };
  }

  if (!childData) {
    return { formError: "No pudimos encontrar al niño en tu guardería." };
  }

  const child = childData as ChildContactRow;
  const room = firstItem(child.rooms);
  const daycare = firstItem(room?.daycares ?? null);
  const childName = child.full_name.trim();
  const roomName = room?.name?.trim() || "";
  const daycareName = daycare?.name?.trim() || "";

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch {
    return { formError: "Falta configurar la clave de servicio en el servidor." };
  }

  const nowIso = new Date().toISOString();

  const { error: expireError } = await admin
    .from("invitations")
    .update({ status: "expired" })
    .eq("child_id", childId)
    .eq("email", email)
    .eq("status", "pending")
    .lte("expires_at", nowIso);

  if (expireError) {
    return { formError: "No pudimos preparar la invitación. Intentá de nuevo." };
  }

  const { data: pendingInvitation, error: pendingError } = await supabase
    .from("invitations")
    .select("id")
    .eq("child_id", childId)
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (pendingError) {
    return { formError: "No pudimos verificar las invitaciones existentes. Intentá de nuevo." };
  }

  if (pendingInvitation) {
    return { errors: { email: "Ya hay una invitación pendiente para este email." } };
  }

  const { data: hasAccount, error: accountError } = await admin.rpc("email_has_account", {
    p_email: email,
  });

  if (accountError) {
    return { formError: "No pudimos verificar el email. Intentá de nuevo." };
  }

  if (hasAccount) {
    return { errors: { email: "Ese email ya tiene una cuenta." } };
  }

  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let finalCode = code;
  let invitationId: string | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        child_id: childId,
        invited_by: userId,
        full_name: name,
        email,
        relationship,
        code: finalCode,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (!error && data) {
      invitationId = (data as { id: string }).id;
      break;
    }

    if (error?.code === "23505" && error.message.includes("invitations_code_active_key")) {
      finalCode = generateCode();
      continue;
    }

    if (error?.code === "23505") {
      return { errors: { email: "Ya hay una invitación pendiente para este email." } };
    }

    if (error?.code === "42501") {
      return { formError: "Tu perfil no tiene permiso para invitar padres." };
    }

    return { formError: "No pudimos guardar la invitación. Intentá de nuevo." };
  }

  if (!invitationId) {
    return { formError: "No pudimos generar un código único. Intentá de nuevo." };
  }

  const appUrl = await resolveAppUrl();

  if (!appUrl) {
    await admin.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);

    return { formError: "Falta configurar APP_URL para enviar la invitación." };
  }

  try {
    await sendInvitationEmail({
      to: email,
      parentName: name,
      childName,
      roomName,
      daycareName,
      code: finalCode,
      appUrl,
      childId,
    });
  } catch (error) {
    await admin.from("invitations").update({ status: "cancelled" }).eq("id", invitationId);

    const message = error instanceof Error ? error.message : "";

    if (/verify a domain|only send testing emails/i.test(message)) {
      return {
        formError:
          "Resend todavía no puede enviar a ese destinatario: sin un dominio verificado solo se entrega al email de la cuenta y a direcciones de prueba @resend.dev. Verificá un dominio en resend.com/domains para enviar a otros correos.",
      };
    }

    return { formError: "No pudimos enviar el correo. Revisá la dirección e intentá de nuevo." };
  }

  revalidatePath(`/kids/${childId}`);

  return { sent: { invitationId, code: finalCode, email } };
}

type ActivationError = {
  code?: string;
  status?: number;
  message?: string;
};

function mapCreateUserError(error: ActivationError): ActivateAccountState {
  const message = error.message?.toLowerCase() ?? "";

  if (error.code === "email_exists" || message.includes("already been registered")) {
    return { errors: { email: "Ya existe una cuenta con este email." } };
  }

  if (error.code === "weak_password" || message.includes("password")) {
    return { errors: { password: "La contraseña no cumple los requisitos mínimos." } };
  }

  if (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
    return { formError: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." };
  }

  return { formError: "No pudimos crear la cuenta. Intentá de nuevo." };
}

export async function activateInvitation(
  _previousState: ActivateAccountState,
  formData: FormData,
): Promise<ActivateAccountState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: NonNullable<ActivateAccountState["errors"]> = {};

  if (!code) {
    errors.code = "Ingresá el código de invitación.";
  } else if (!CODE_PATTERN.test(code)) {
    errors.code = "El código de invitación no es válido.";
  }

  if (!email) {
    errors.email = "Ingresá tu email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Ingresá un email válido.";
  }

  if (!password) {
    errors.password = "Creá una contraseña.";
  } else if (password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let invitation: Awaited<ReturnType<typeof getInvitationByCode>> = null;

  try {
    invitation = await getInvitationByCode(code);
  } catch {
    return { formError: "No pudimos verificar la invitación. Intentá de nuevo." };
  }

  if (!invitation) {
    return { errors: { code: "No encontramos una invitación con ese código." } };
  }

  if (invitation.status === "accepted") {
    return { errors: { code: "Esta invitación ya fue utilizada." } };
  }

  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    return { errors: { code: "Esta invitación venció. Pedile a la guardería que te envíe una nueva." } };
  }

  if (invitation.email.toLowerCase() !== email) {
    return { errors: { email: "El email no coincide con la invitación." } };
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch {
    return { formError: "Falta configurar la clave de servicio en el servidor." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return mapCreateUserError(createError ?? {});
  }

  const createdUserId = created.user.id;
  const { error: acceptError } = await admin.rpc("accept_invitation", {
    p_invitation_id: invitation.id,
    p_user_id: createdUserId,
    p_full_name: invitation.fullName,
  });

  if (acceptError) {
    try {
      await admin.auth.admin.deleteUser(createdUserId);
    } catch {
      // The orphaned auth user is reported below; the next acceptance attempt can retry.
    }

    const message = acceptError.message ?? "";

    if (message.includes("invitation_not_pending")) {
      return { errors: { code: "Esta invitación ya fue utilizada." } };
    }

    if (message.includes("invitation_expired")) {
      return { errors: { code: "Esta invitación venció. Pedile a la guardería que te envíe una nueva." } };
    }

    if (message.includes("invitation_email_mismatch")) {
      return { errors: { email: "El email no coincide con la invitación." } };
    }

    return { formError: "No pudimos vincular la cuenta. Intentá de nuevo." };
  }

  const supabase = await createClient();

  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      return { formError: "Tu cuenta ya está activa, pero no pudimos iniciar sesión. Iniciá sesión con tu email y contraseña." };
    }
  } catch {
    return { formError: "Tu cuenta ya está activa, pero no pudimos iniciar sesión. Iniciá sesión con tu email y contraseña." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
