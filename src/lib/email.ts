import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMailHtml(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error(
      "Falta SMTP: define SMTP_USER y SMTP_PASS (contraseña de aplicación de Gmail u otro SMTP).",
    );
  }

  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const from = process.env.SMTP_FROM ?? user;

  await transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
