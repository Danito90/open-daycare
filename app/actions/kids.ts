"use server";

import { revalidatePath } from "next/cache";
import { isValidIsoDate } from "@/utils/kids/format";
import { isUuid } from "@/utils/kids/queries";
import { isStaffRole } from "@/utils/auth/roles";
import { getCurrentProfile } from "@/utils/auth/current-user";
import { isAllergyTag, type AddKidState, type EditKidState, type UpdatePhotoConsentState } from "@/utils/kids/types";
import { createClient } from "@/utils/supabase/server";
import { hasOperationalAccess } from "@/utils/staff/access";

const INSERT_ERROR_MESSAGES: Record<string, string> = {
  "42501": "Tu perfil no tiene permiso para agregar niños.",
  "23503": "La sala seleccionada ya no está disponible.",
  "23514": "Revisá los datos del niño e intentá de nuevo.",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function createKid(_previousState: AddKidState, formData: FormData): Promise<AddKidState> {
  const name = String(formData.get("name") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const medicalNotes = String(formData.get("medicalNotes") ?? "").trim();
  const allergyTags = [...new Set(formData.getAll("allergyTags").map(String))];

  const errors: NonNullable<AddKidState["errors"]> = {};

  if (!name) {
    errors.name = "Ingresá el nombre completo.";
  }

  if (!birthDate) {
    errors.birthDate = "Elegí la fecha de nacimiento.";
  } else if (!isValidIsoDate(birthDate)) {
    errors.birthDate = "Elegí una fecha válida.";
  } else if (birthDate > todayIso()) {
    errors.birthDate = "La fecha de nacimiento no puede ser futura.";
  }

  if (!roomId) {
    errors.roomId = "Seleccioná una sala.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  if (!allergyTags.every(isAllergyTag)) {
    return { formError: "Alguna etiqueta de alergia no es válida. Recargá la página e intentá de nuevo." };
  }

  if (!isUuid(roomId)) {
    return { errors: { roomId: "Seleccioná una sala válida." } };
  }

  const supabase = await createClient();

  const current = await getCurrentProfile();
  if (!current?.userId || !isStaffRole(current.role) ||
    (current.role === "staff" && !(await hasOperationalAccess(current.userId)))) {
    return { formError: "Tu perfil no tiene salas asignadas para agregar niños." };
  }

  try {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims) {
      return { formError: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
    }
  } catch {
    return { formError: "No pudimos verificar tu sesión. Intentá de nuevo." };
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    return { formError: "No pudimos verificar la sala. Intentá de nuevo." };
  }

  if (!room) {
    return { errors: { roomId: "Elegí una sala de tu guardería." } };
  }

  const { error } = await supabase
    .from("children")
    .insert({
      room_id: roomId,
      full_name: name,
      birth_date: birthDate,
      medical_notes: medicalNotes || null,
      allergy_tags: allergyTags,
    });

  if (error) {
    return { formError: INSERT_ERROR_MESSAGES[error?.code ?? ""] ?? "No pudimos guardar el niño. Intentá de nuevo." };
  }

  revalidatePath("/kids");

  return { saved: true };
}

export async function editKid(_previousState: EditKidState, formData: FormData): Promise<EditKidState> {
  const childId = String(formData.get("childId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const enrolledAt = String(formData.get("enrolledAt") ?? "").trim();
  const roomId = String(formData.get("roomId") ?? "").trim();
  const medicalNotes = String(formData.get("medicalNotes") ?? "").trim();
  const allergyTags = [...new Set(formData.getAll("allergyTags").map(String))];

  if (!isUuid(childId)) {
    return { formError: "No pudimos identificar al niño. Recargá la página e intentá de nuevo." };
  }

  const errors: NonNullable<EditKidState["errors"]> = {};

  if (!name) errors.name = "Ingresá el nombre completo.";
  if (!isValidIsoDate(birthDate) || birthDate > todayIso()) {
    errors.birthDate = "Elegí una fecha de nacimiento válida y no futura.";
  }
  if (!isValidIsoDate(enrolledAt) || enrolledAt > todayIso()) {
    errors.enrolledAt = "Elegí una fecha de ingreso válida y no futura.";
  }
  if (!isUuid(roomId)) errors.roomId = "Seleccioná una sala válida.";
  if (Object.keys(errors).length > 0) return { errors };

  if (!allergyTags.every(isAllergyTag)) {
    return { formError: "Alguna etiqueta de alergia no es válida. Recargá la página e intentá de nuevo." };
  }

  const profile = await getCurrentProfile();

  if (!profile?.userId || !isStaffRole(profile.role) || !profile.daycareId) {
    return { formError: "Tu perfil no tiene permiso para editar niños." };
  }
  if (profile.role === "staff" && !(await hasOperationalAccess(profile.userId))) {
    return { formError: "Tu perfil no tiene salas asignadas para editar niños." };
  }

  const supabase = await createClient();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("daycare_id", profile.daycareId)
    .maybeSingle();

  if (roomError) return { formError: "No pudimos verificar la sala. Intentá de nuevo." };
  if (!room) return { errors: { roomId: "Elegí una sala de tu guardería." } };

  const { data, error } = await supabase
    .from("children")
    .update({
      full_name: name,
      birth_date: birthDate,
      enrolled_at: enrolledAt,
      room_id: roomId,
      medical_notes: medicalNotes || null,
      allergy_tags: allergyTags,
    })
    .eq("id", childId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { formError: error.code === "42501" ? "Tu perfil no tiene permiso para editar este niño." : "No pudimos guardar los cambios. Intentá de nuevo." };
  }
  if (!data) return { formError: "No pudimos encontrar a este niño en tu guardería." };

  revalidatePath(`/kids/${childId}`);
  revalidatePath("/kids");
  revalidatePath("/cuenta");
  revalidatePath("/resumen");
  revalidatePath("/");

  return { saved: true };
}

export async function updatePhotoConsent(
  _previousState: UpdatePhotoConsentState,
  formData: FormData,
): Promise<UpdatePhotoConsentState> {
  const childId = String(formData.get("childId") ?? "");
  const rawConsent = String(formData.get("photoConsent") ?? "");

  if (!isUuid(childId)) {
    return { formError: "No pudimos identificar al niño. Recargá la página e intentá de nuevo." };
  }

  if (rawConsent !== "true" && rawConsent !== "false") {
    return { errors: { photoConsent: "Elegí si autorizás o no las fotos." } };
  }

  const profile = await getCurrentProfile();

  if (!profile?.userId || profile.role !== "parent") {
    return { formError: "Solo un padre vinculado puede cambiar el consentimiento." };
  }

  const supabase = await createClient();

  try {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError || !claimsData?.claims) {
      return { formError: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
    }
  } catch {
    return { formError: "No pudimos verificar tu sesión. Intentá de nuevo." };
  }

  const { data, error } = await supabase
    .from("children")
    .update({ photo_consent: rawConsent === "true" })
    .eq("id", childId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      formError:
        error.code === "42501"
          ? "Tu perfil no tiene permiso para cambiar el consentimiento."
          : "No pudimos guardar el consentimiento. Intentá de nuevo.",
    };
  }

  if (!data) {
    return { formError: "No pudimos actualizar el consentimiento de este niño." };
  }

  revalidatePath(`/kids/${childId}`);
  revalidatePath("/kids");
  revalidatePath("/cuenta");

  return { saved: true };
}
