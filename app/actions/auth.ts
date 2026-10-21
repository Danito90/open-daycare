"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LoginState } from "@/app/(auth)/login/types";
import { safeNextPath } from "@/utils/auth/routes";
import { createClient } from "@/utils/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_CODES = new Set(["over_request_rate_limit", "over_email_send_rate_limit"]);

type AuthError = {
  code?: string;
  status?: number;
};

function mapAuthError(error: AuthError) {
  if (error.code === "invalid_credentials") return "Email o contraseña incorrectos.";
  if (error.code === "email_not_confirmed") return "Tu email todavía no está confirmado.";
  if (error.code && RATE_LIMIT_CODES.has(error.code)) return "Demasiados intentos. Esperá unos minutos.";

  return "No pudimos iniciar sesión. Intentá de nuevo.";
}

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = safeNextPath(String(formData.get("next") ?? ""));

  const errors: NonNullable<LoginState["errors"]> = {};

  if (!email) {
    errors.email = "Ingresá tu email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Ingresá un email válido.";
  }

  if (!password) {
    errors.password = "Ingresá tu contraseña.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();

  let authError: AuthError | null = null;

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    authError = error;
  } catch {
    return { formError: "No pudimos iniciar sesión. Intentá de nuevo." };
  }

  if (authError) {
    return { formError: mapAuthError(authError) };
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signOut() {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      await supabase.auth.signOut({ scope: "local" });
    }
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The next request will clear any remaining session cookies.
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
