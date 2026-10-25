import type { Metadata } from "next";
import { RequestResetForm } from "./request-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña · OpenDayCare",
};

type RecoverPasswordPageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

export default async function RecoverPasswordPage({ searchParams }: RecoverPasswordPageProps) {
  const params = await searchParams;
  const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  return <RequestResetForm initialEmail={rawEmail ?? ""} />;
}
