import nodemailer from "nodemailer";

function envTrim(name: string): string {
  const v = process.env[name];
  if (v == null) return "";
  return v.trim();
}

/** Listo para enviar notificaciones sin depender del OAuth Gmail del usuario (ideal en Vercel). */
export function isSmtpConfigured(): boolean {
  return Boolean(
    envTrim("SMTP_HOST") && envTrim("SMTP_USER") && envTrim("SMTP_PASS"),
  );
}

export async function sendMailHtmlViaSmtp(params: {
  to: string | string[];
  subject: string;
  html: string;
  /** Quien inició sesión (opcional); los destinatarios pueden responder a esa persona. */
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    contentType?: string;
    content: Buffer;
  }>;
}): Promise<void> {
  const host = envTrim("SMTP_HOST");
  const user = envTrim("SMTP_USER");
  const pass = envTrim("SMTP_PASS");
  if (!host || !user || !pass) {
    throw new Error(
      "SMTP no configurado: define SMTP_HOST, SMTP_USER y SMTP_PASS.",
    );
  }

  const portRaw = envTrim("SMTP_PORT");
  const port = portRaw ? parseInt(portRaw, 10) : 587;
  if (!Number.isFinite(port) || port < 1) {
    throw new Error("SMTP_PORT no es un número válido.");
  }

  const fromRaw = envTrim("SMTP_FROM");
  const from = fromRaw || `Registros <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const to = Array.isArray(params.to) ? params.to.join(", ") : params.to;

  await transporter.sendMail({
    from,
    to,
    subject: params.subject,
    html: params.html,
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  });
}
