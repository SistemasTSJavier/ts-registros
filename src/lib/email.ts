import {
  getAuthJwtFromRequest,
  sendMailHtmlViaGmailWithJwt,
} from "@/lib/gmail-oauth-send";

export async function sendMailHtml(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const jwt = await getAuthJwtFromRequest();
  const hasGmailOAuth =
    Boolean(jwt?.email) &&
    Boolean(jwt?.googleRefreshToken || jwt?.googleAccessToken);

  if (!jwt?.email) {
    throw new Error(
      "Debes iniciar sesión con Google para enviar correos (solo desde tu cuenta Gmail).",
    );
  }

  if (!hasGmailOAuth) {
    throw new Error(
      "Tu sesión no tiene permiso de envío de Gmail. Cierra sesión y vuelve a entrar para conceder el permiso.",
    );
  }

  await sendMailHtmlViaGmailWithJwt(jwt, params);
}
