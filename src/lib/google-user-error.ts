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
      "Los datos se guardan en el espacio de trabajo que elijas en /espacio. " +
      "Si la hoja está en un Drive compartido (Shared drive), la cuenta de servicio debe ser miembro de ese Drive, no solo tener el archivo compartido. " +
      `[Detalle: ${msg}]`
    );
  }

  return msg;
}
