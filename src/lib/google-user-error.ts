import { envTrim } from "@/lib/google-env";

/** Mensaje legible cuando Google devuelve 403 / permisos. */
export function formatGoogleApiErrorForUser(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  const sa = envTrim("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL");
  const shareHint = sa
    ? `En Google Drive, comparte la carpeta y la hoja de cálculo con ${sa} como Editor. `
    : "En Google Drive, comparte la carpeta y la hoja con el correo de la cuenta de servicio (…@….iam.gserviceaccount.com) como Editor. ";

  if (
    lower.includes("permission") ||
    lower.includes("403") ||
    lower.includes("the caller does not have permission")
  ) {
    return (
      "Google rechazó el acceso (sin permiso). " +
      "En Google Cloud, confirma que las APIs «Google Drive» y «Google Sheets» están habilitadas en el proyecto de esa cuenta de servicio. " +
      shareHint +
      "Si tienes más de un espacio de trabajo en la app, define PUBLIC_WORKSPACE_ID en Vercel con el id del espacio que deben usar los formularios públicos. " +
      `[Detalle: ${msg}]`
    );
  }

  return msg;
}
