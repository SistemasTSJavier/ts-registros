import type { JWT } from "next-auth/jwt";
import { google } from "googleapis";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies, headers } from "next/headers";
import { decode, getToken } from "next-auth/jwt";

import { auth } from "@/auth";

function envTrim(name: string): string {
  const v = process.env[name];
  if (v == null) return "";
  return v.trim();
}

export function getAuthSecretForJwt(): string {
  return envTrim("AUTH_SECRET") || envTrim("NEXTAUTH_SECRET");
}

function encodeSubject(subject: string): string {
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function buildRfc2822(params: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): string {
  const toHeader = Array.isArray(params.to) ? params.to.join(", ") : params.to;
  const htmlB64 = Buffer.from(params.html, "utf8").toString("base64");
  return [
    `From: ${params.from}`,
    `To: ${toHeader}`,
    `Subject: ${encodeSubject(params.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    "",
    htmlB64.replace(/(.{76})/g, "$1\r\n").trimEnd(),
  ].join("\r\n");
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAtSec: number;
}> {
  const clientId = envTrim("AUTH_GOOGLE_ID") || envTrim("GOOGLE_CLIENT_ID");
  const clientSecret =
    envTrim("AUTH_GOOGLE_SECRET") || envTrim("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Faltan AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET para renovar el token de Gmail.");
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    const detail =
      data.error_description ?? data.error ?? `${res.status} ${res.statusText}`;
    throw new Error(`No se pudo renovar el acceso a Gmail: ${detail}`);
  }
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return {
    accessToken: data.access_token,
    expiresAtSec: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

async function resolveAccessTokenForGmail(jwt: JWT): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const margin = 120;
  const exp = jwt.googleExpiresAt;
  if (
    jwt.googleAccessToken &&
    exp != null &&
    nowSec < exp - margin
  ) {
    return jwt.googleAccessToken;
  }
  if (jwt.googleRefreshToken) {
    const r = await refreshGoogleAccessToken(jwt.googleRefreshToken);
    return r.accessToken;
  }
  if (jwt.googleAccessToken) {
    return jwt.googleAccessToken;
  }
  throw new Error(
    "Sin token de Gmail válido. Cierra sesión y vuelve a entrar para conceder el permiso de envío de correo.",
  );
}

/**
 * Cookie de sesión en un solo fragmento o en trozos (.0, .1, …) como hace Auth.js.
 */
function readSessionTokenFromJar(
  jar: Awaited<ReturnType<typeof cookies>>,
  baseName: string,
): string | null {
  const single = jar.get(baseName)?.value;
  if (single) return single;

  const parts: { i: number; v: string }[] = [];
  const prefix = `${baseName}.`;
  for (const c of jar.getAll()) {
    if (!c.name.startsWith(prefix)) continue;
    const suf = c.name.slice(prefix.length);
    const i = parseInt(suf, 10);
    if (!Number.isFinite(i)) continue;
    parts.push({ i, v: c.value });
  }
  if (parts.length === 0) return null;
  parts.sort((a, b) => a.i - b.i);
  return parts.map((p) => p.v).join("");
}

/** Misma lógica que Auth.js al leer el JWE de la cookie (nombre = salt). */
async function decodeSessionJwtFromCookies(secret: string): Promise<JWT | null> {
  const jar = await cookies();
  const bases = [
    "__Secure-authjs.session-token",
    "authjs.session-token",
  ] as const;

  for (const base of bases) {
    const raw = readSessionTokenFromJar(jar, base);
    if (!raw) continue;
    try {
      const payload = await decode({ token: raw, secret, salt: base });
      if (payload && typeof payload === "object") {
        return payload as JWT;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function buildCookieHeaderForAuth(): Promise<string> {
  const jar = await cookies();
  const fromJar = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  if (fromJar) return fromJar;
  return (await headers()).get("cookie")?.trim() ?? "";
}

/**
 * Lee el JWT de sesión de Auth.js (mismos datos que usa `auth()`).
 * 1) Lee la cookie con `cookies()` + `decode` (fiable en Server Actions / Vercel).
 * 2) Respaldo con `getToken` y cabecera Cookie (segura / no segura).
 * 3) Si falta `email` en el payload pero `auth()` sí lo tiene, se completa.
 */
export async function getAuthJwtFromRequest(): Promise<JWT | null> {
  const secret = getAuthSecretForJwt();
  if (!secret) return null;

  let token =
    (await decodeSessionJwtFromCookies(secret)) ??
    (await (async () => {
      const cookie = await buildCookieHeaderForAuth();
      if (!cookie) return null;
      const req = { headers: { cookie } };
      let t = await getToken({ req, secret, secureCookie: false });
      if (!t) t = await getToken({ req, secret, secureCookie: true });
      return t;
    })());

  if (token) {
    const session = await auth();
    const sessionEmail = session?.user?.email;
    if (sessionEmail && !token.email) {
      token = { ...token, email: sessionEmail };
    }
  }

  return token;
}

/**
 * Envía correo con la cuenta Google del usuario (Gmail API).
 */
export async function sendMailHtmlViaGmailWithJwt(
  jwt: JWT,
  params: {
    to: string | string[];
    subject: string;
    html: string;
  },
): Promise<void> {
  if (!jwt.email) {
    throw new Error("No hay sesión con correo para enviar desde Gmail.");
  }

  const accessToken = await resolveAccessTokenForGmail(jwt);

  const clientId = envTrim("AUTH_GOOGLE_ID") || envTrim("GOOGLE_CLIENT_ID");
  const clientSecret =
    envTrim("AUTH_GOOGLE_SECRET") || envTrim("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Faltan AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET.");
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const from = String(jwt.email);
  const mime = buildRfc2822({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  const raw = Buffer.from(mime)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
