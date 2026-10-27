"use server";

import { revalidatePath } from "next/cache";
import type { UpdatePreferencesState, UpdateProfileState } from "@/utils/account/types";
import { createClient } from "@/utils/supabase/server";

const MAX_NAME_LENGTH = 80;

const PREFERENCE_FIELDS = ["notify_on_post", "daily_summary_enabled"] as const;

type PreferenceField = (typeof PREFERENCE_FIELDS)[number];

function isPreferenceField(value: string): value is PreferenceField {
  return (PREFERENCE_FIELDS as readonly string[]).includes(value);
}

async function getCurrentUser() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string") {
      return { supabase, userId: null, formError: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
    }

    return { supabase, userId, formError: null };
  } catch {
    return { supabase, userId: null, formError: "No pudimos verificar tu sesión. Intentá de nuevo." };
  }
}

export async function updateProfile(
  _previousState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!fullName) {
    return { errors: { fullName: "Escribí tu nombre." } };
  }

  if (fullName.length > MAX_NAME_LENGTH) {
    return { errors: { fullName: `Usá como máximo ${MAX_NAME_LENGTH} caracteres.` } };
  }

  const { supabase, userId, formError } = await getCurrentUser();

  if (!userId) {
    return { formError: formError ?? "No pudimos verificar tu sesión. Intentá de nuevo." };
  }

  const { data, error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      formError:
        error.code === "42501"
          ? "Tu perfil no tiene permiso para cambiar el nombre."
          : "No pudimos guardar tu nombre. Intentá de nuevo.",
    };
  }

  if (!data) {
    return { formError: "No pudimos actualizar tu perfil." };
  }

  revalidatePath("/cuenta");
  revalidatePath("/", "layout");

  return { saved: true };
}

export async function updatePreferences(
  _previousState: UpdatePreferencesState,
  formData: FormData,
): Promise<UpdatePreferencesState> {
  const field = String(formData.get("field") ?? "");
  const rawValue = String(formData.get("value") ?? "");

  if (!isPreferenceField(field)) {
    return { formError: "No pudimos identificar la preferencia. Recargá la página e intentá de nuevo." };
  }

  if (rawValue !== "true" && rawValue !== "false") {
    return { formError: "No pudimos interpretar el cambio. Intentá de nuevo." };
  }

  const { supabase, userId, formError } = await getCurrentUser();

  if (!userId) {
    return { formError: formError ?? "No pudimos verificar tu sesión. Intentá de nuevo." };
  }

  const { data, error } = await supabase
    .from("users")
    .update({ [field]: rawValue === "true" })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      formError:
        error.code === "42501"
          ? "Tu perfil no tiene permiso para cambiar las notificaciones."
          : "No pudimos guardar la preferencia. Intentá de nuevo.",
    };
  }

  if (!data) {
    return { formError: "No pudimos actualizar tus preferencias." };
  }

  revalidatePath("/cuenta");

  return { saved: true };
}
