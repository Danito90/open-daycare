import "server-only";

import { Resend } from "resend";

export type InvitationEmailInput = {
  to: string;
  parentName: string;
  childName: string;
  roomName: string;
  daycareName: string;
  code: string;
  appUrl: string;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function buildLink(appUrl: string, code: string) {
  return `${appUrl.replace(/\/+$/, "")}/activar-cuenta?code=${encodeURIComponent(code)}`;
}

export function buildInvitationEmail(input: InvitationEmailInput) {
  const link = buildLink(input.appUrl, input.code);
  const parentName = singleLine(input.parentName);
  const childName = singleLine(input.childName);
  const roomName = singleLine(input.roomName);
  const daycareName = singleLine(input.daycareName);

  const subject = `Te invitamos a seguir a ${childName} en OpenDayCare`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#F6ECDF;font-family:Nunito,Arial,sans-serif;color:#3F362E;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background:#FFFDF9;border:1px solid #ECE0D0;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#D9583C;">OpenDayCare</p>
          <h1 style="margin:0;font-family:Fredoka,Arial,sans-serif;font-size:26px;line-height:1.2;color:#3F362E;">Hola, ${escapeHtml(parentName)}</h1>
          <p style="margin:14px 0 0;font-size:16px;line-height:1.55;color:#6E6359;">
            Te invitaron a seguir el día de <strong style="color:#3F362E;">${escapeHtml(childName)}</strong>
            en la sala <strong style="color:#3F362E;">${escapeHtml(roomName)}</strong> de ${escapeHtml(daycareName)}.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <div style="border:1.5px dashed #E6D08A;border-radius:16px;background:#FBF1D6;padding:20px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.7px;color:#A88526;">CÓDIGO DE INVITACIÓN</p>
            <p style="margin:0;font-family:Fredoka,Arial,sans-serif;font-size:34px;font-weight:600;letter-spacing:7px;color:#8A7234;">${escapeHtml(input.code)}</p>
            <p style="margin:8px 0 0;font-size:13px;color:#A88526;">Vence en 7 días</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;">
          <a href="${escapeHtml(link)}" style="display:block;border-radius:14px;background:#EE8164;color:#ffffff;padding:15px 20px;text-align:center;font-size:16px;font-weight:800;text-decoration:none;">Activar mi cuenta</a>
          <p style="margin:18px 0 0;font-size:12.5px;line-height:1.5;color:#A89A8B;word-break:break-all;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />${escapeHtml(link)}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hola, ${parentName}`,
    "",
    `Te invitaron a seguir el día de ${childName} en la sala ${roomName} de ${daycareName}.`,
    "",
    `Código de invitación: ${input.code}`,
    "Vence en 7 días.",
    "",
    `Activá tu cuenta acá: ${link}`,
    "",
    "OpenDayCare",
  ].join("\n");

  return { subject, html, text, link };
}

export async function sendInvitationEmail(input: InvitationEmailInput & { childId: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  const resend = new Resend(apiKey);
  const { subject, html, text } = buildInvitationEmail(input);

  const { data, error } = await resend.emails.send(
    {
      from,
      to: input.to,
      subject,
      html,
      text,
    },
    { idempotencyKey: `invite/${input.childId}/${input.code}` },
  );

  if (error || !data) {
    throw new Error(error?.message ?? "Resend did not return an email id.");
  }

  return { id: data.id };
}
