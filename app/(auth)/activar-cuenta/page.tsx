import type { Metadata } from "next";
import { getInvitationSummary } from "@/utils/invitations/queries";
import type { InvitationSummary } from "@/utils/invitations/types";
import { ActivateAccountForm } from "./activate-form";

export const metadata: Metadata = {
  title: "Activar cuenta · OpenDayCare",
};

export default async function ActivateAccountPage({ searchParams }: PageProps<"/activar-cuenta">) {
  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = (rawCode ?? "").trim().toUpperCase();

  let summary: InvitationSummary | null = null;

  if (code) {
    try {
      summary = await getInvitationSummary(code);
    } catch {
      summary = null;
    }
  }

  return <ActivateAccountForm initialCode={code} summary={summary} />;
}
