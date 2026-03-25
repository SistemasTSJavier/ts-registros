/** Evita fallos por espacios al pegar en Vercel. */
export function envTrim(name: string): string {
  const v = process.env[name];
  if (v == null) return "";
  return v.trim();
}

/**
 * Mensaje para UI cuando faltan credenciales de la cuenta de servicio (Drive/Sheets).
 * El login OAuth (AUTH_GOOGLE_*) no sustituye esto: son credenciales distintas.
 */
export const GOOGLE_SERVICE_ACCOUNT_MISSING_USER_MESSAGE =
  "Falta la cuenta de servicio de Google (Drive/Sheets). " +
  "En Vercel define GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY " +
  "(Google Cloud → IAM → Cuentas de servicio → clave JSON: client_email y private_key). " +
  "Habilita las APIs Google Drive y Google Sheets en ese proyecto. " +
  "El login con Google no crea archivos en tu Drive: los crea la cuenta de servicio. " +
  "Para ver la carpeta en tu Drive: comparte una carpeta con el correo …@….iam.gserviceaccount.com como Editor y pon GOOGLE_DRIVE_FOLDER_ID.";
