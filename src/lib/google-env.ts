import { createPrivateKey } from "node:crypto";

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

const PEM_VARIANTS = [
  {
    begin: "-----BEGIN PRIVATE KEY-----",
    end: "-----END PRIVATE KEY-----",
  },
  {
    begin: "-----BEGIN RSA PRIVATE KEY-----",
    end: "-----END RSA PRIVATE KEY-----",
  },
] as const;

/** Si el PEM llegó en una sola línea (muy típico al pegar en Vercel), reparte base64 en líneas de 64 caracteres. */
function reflowPemIfSingleLine(s: string): string {
  for (const { begin, end } of PEM_VARIANTS) {
    const iBegin = s.indexOf(begin);
    const iEnd = s.indexOf(end);
    if (iBegin === -1 || iEnd === -1 || iEnd <= iBegin) continue;
    const afterBegin = iBegin + begin.length;
    const middle = s.slice(afterBegin, iEnd).trim();
    if (middle.includes("\n")) return s;
    const b64 = middle.replace(/\s/g, "");
    if (b64.length < 64) return s;
    const lines = b64.match(/.{1,64}/g) ?? [];
    return `${begin}\n${lines.join("\n")}\n${end}\n`;
  }
  return s;
}

/**
 * Normaliza el valor de `private_key` del JSON de Google (saltos `\n`, comillas, CRLF, PEM en una línea).
 */
export function normalizeGoogleServiceAccountPrivateKey(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/\\n/g, "\n");
  s = reflowPemIfSingleLine(s);
  return s.trimEnd();
}

export const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_INVALID_MESSAGE =
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no es un PEM válido. " +
  "Copia el valor de \"private_key\" del JSON de Google (incluye -----BEGIN… y -----END…). " +
  "En Vercel: sin comillas extra; si es una sola línea, los \\n del JSON deben quedar como saltos (o pega la clave en varias líneas). " +
  "Detalle técnico: ";

/**
 * Devuelve el PEM listo para `google.auth.JWT` y valida que Node pueda decodificarlo (evita error OpenSSL 1E08010C sin contexto).
 */
export function prepareGoogleServiceAccountPrivateKey(raw: string): string {
  const pem = normalizeGoogleServiceAccountPrivateKey(raw);
  if (!pem.includes("BEGIN") || !pem.includes("PRIVATE KEY")) {
    throw new Error(
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_INVALID_MESSAGE +
        "no se encontró un bloque PEM BEGIN/END.",
    );
  }
  try {
    createPrivateKey({ key: pem, format: "pem" });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_INVALID_MESSAGE + detail);
  }
  return pem;
}
