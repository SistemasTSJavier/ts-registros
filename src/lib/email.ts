import { auth } from "@/auth";
import { sendMailHtmlViaSmtp, isSmtpConfigured } from "@/lib/email-smtp";
import {
  getAuthJwtFromRequest,
  getAuthSecretForJwt,
  sendMailHtmlViaGmailWithJwt,
} from "@/lib/gmail-oauth-send";

/**
 * Envía correo HTML a destinatarios del formulario.
 *
 * 1) Si existen SMTP_HOST + SMTP_USER + SMTP_PASS (p. ej. Gmail con contraseña de aplicación),
 *    se usa SMTP desde el servidor — suele ser lo más fiable en Vercel.
 * 2) Si no, se intenta Gmail API con la sesión OAuth del usuario (gmail.send).
 */
export async function sendMailHtml(params: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    contentType?: string;
    content: Buffer;
  }>;
}): Promise<void> {
  if (isSmtpConfigured()) {
    const session = await auth();
    await sendMailHtmlViaSmtp({
      ...params,
      replyTo: session?.user?.email ?? undefined,
    });
    return;
  }

  const jwt = await getAuthJwtFromRequest();
  const hasGmailOAuth =
    Boolean(jwt?.email) &&
    Boolean(jwt?.googleRefreshToken || jwt?.googleAccessToken);

  if (!jwt?.email) {
    const session = await auth();
    const hasSessionUser = Boolean(session?.user?.email);
    const hasSecret = Boolean(getAuthSecretForJwt());
    if (hasSessionUser && !hasSecret) {
      throw new Error(
        "Falta AUTH_SECRET (o NEXTAUTH_SECRET) en el servidor: no se puede leer la sesión para Gmail.",
      );
    }
    if (hasSessionUser) {
      throw new Error(
        "No se pudo leer el token de sesión para enviar correo. Configura SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) en Vercel para envío fiable, o revisa AUTH_SECRET / AUTH_URL y vuelve a iniciar sesión con Google.",
      );
    }
    throw new Error(
      "Debes iniciar sesión con Google. Para enviar sin Gmail API, configura SMTP en el servidor.",
    );
  }

  if (!hasGmailOAuth) {
    throw new Error(
      "Tu sesión no tiene permiso de envío de Gmail, o configura SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) en Vercel. Si usas solo OAuth: cierra sesión, revoca la app en tu cuenta Google y vuelve a entrar.",
    );
  }

  await sendMailHtmlViaGmailWithJwt(jwt, params);
}
