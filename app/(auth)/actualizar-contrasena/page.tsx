import type { Metadata } from "next";
import { UpdatePasswordForm } from "./update-form";

export const metadata: Metadata = {
  title: "Nueva contraseña · OpenDayCare",
};

type UpdatePasswordPageProps = {
  searchParams: Promise<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const rawErrorDescription = Array.isArray(params.error_description) ? params.error_description[0] : params.error_description;

  return <UpdatePasswordForm code={(rawCode ?? "").trim()} linkError={Boolean(rawError || rawErrorDescription)} />;
}
