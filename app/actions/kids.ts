"use server";

import { revalidatePath } from "next/cache";
import { isValidIsoDate } from "@/utils/kids/format";
import { isUuid } from "@/utils/kids/queries";
import { isAllergyTag, type AddKidState, type UpdatePhotoConsentState } from "@/utils/kids/types";
import { createClient } from "@/utils/supabase/server";

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

  const { data, error } = await supabase
    .from("children")
    .insert({
      room_id: roomId,
      full_name: name,
      birth_date: birthDate,
      medical_notes: medicalNotes || null,
      allergy_tags: allergyTags,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { formError: INSERT_ERROR_MESSAGES[error?.code ?? ""] ?? "No pudimos guardar el niño. Intentá de nuevo." };
  }

  revalidatePath("/kids");

  return { savedKidId: (data as { id: string }).id };
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
