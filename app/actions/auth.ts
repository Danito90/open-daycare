"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UpdatePasswordState } from "@/app/(auth)/actualizar-contrasena/types";
import type { LoginState } from "@/app/(auth)/login/types";
import type { RequestResetState } from "@/app/(auth)/recuperar-contrasena/types";
import { safeNextPath } from "@/utils/auth/routes";
import { createClient } from "@/utils/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RATE_LIMIT_CODES = new Set(["over_request_rate_limit", "over_email_send_rate_limit"]);
const EXPIRED_LINK_MESSAGE = "El enlace venció o ya fue usado. Pedí uno nuevo.";

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

async function currentOrigin() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const forwardedProto = headerList.get("x-forwarded-proto");
  const protocol = forwardedProto ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function requestPasswordReset(_previousState: RequestResetState, formData: FormData): Promise<RequestResetState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { errors: { email: "Ingresá tu email." } };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { errors: { email: "Ingresá un email válido." } };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await currentOrigin()}/actualizar-contrasena`,
    });

    if (error && error.code && RATE_LIMIT_CODES.has(error.code)) {
      return { formError: "Demasiados intentos. Esperá unos minutos." };
    }
  } catch {
    return { formError: "No pudimos enviar el correo. Intentá de nuevo en unos minutos." };
  }

  // Always reported as sent so the form never reveals whether an account exists.
  return { sent: true };
}

export async function updatePassword(_previousState: UpdatePasswordState, formData: FormData): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  const errors: NonNullable<UpdatePasswordState["errors"]> = {};

  if (!password) {
    errors.password = "Ingresá una contraseña.";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (!passwordConfirmation) {
    errors.passwordConfirmation = "Repetí la contraseña.";
  } else if (password !== passwordConfirmation) {
    errors.passwordConfirmation = "Las contraseñas no coinciden.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return { formError: EXPIRED_LINK_MESSAGE };
    }
  }

  try {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      if (error.code === "same_password") {
        return { formError: "Elegí una contraseña distinta a la anterior." };
      }

      if (error.name === "AuthSessionMissingError") {
        return { formError: EXPIRED_LINK_MESSAGE };
      }

      return { formError: "No pudimos guardar la contraseña. Pedí un enlace nuevo." };
    }
  } catch {
    return { formError: EXPIRED_LINK_MESSAGE };
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The recovery session will be replaced by the new login.
  }

  revalidatePath("/", "layout");
  redirect("/login?reset=ok");
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
