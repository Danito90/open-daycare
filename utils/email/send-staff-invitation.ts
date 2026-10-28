import "server-only";

import { Resend } from "resend";
import { escapeHtml } from "./send-invitation";

export async function sendStaffInvitation(input: {
  to: string; name: string; daycare: string; code: string; appUrl: string; invitationId: string;
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!from || !key) throw new Error("Email configuration unavailable");
  const link = `${input.appUrl.replace(/\/+$/, "")}/activar-cuenta?code=${encodeURIComponent(input.code)}`;
  const name = input.name.replace(/[\r\n]+/g, " ");
  const daycare = input.daycare.replace(/[\r\n]+/g, " ");
  const { data, error } = await new Resend(key).emails.send({
    from, to: input.to, subject: `Invitación al equipo de ${daycare} · OpenDayCare`,
    html: `<h1>Hola, ${escapeHtml(name)}</h1><p>Te invitaron a trabajar en ${escapeHtml(daycare)}.</p><p>Tu código es <strong>${escapeHtml(input.code)}</strong> y vence en 7 días.</p><a href="${escapeHtml(link)}">Activar mi cuenta</a>`,
    text: `Hola, ${name}. Te invitaron a trabajar en ${daycare}. Tu código es ${input.code} y vence en 7 días. Activá tu cuenta: ${link}`,
  }, { idempotencyKey: `staff/${input.invitationId}` });
  if (error || !data) throw new Error("Could not deliver staff invitation");
}
