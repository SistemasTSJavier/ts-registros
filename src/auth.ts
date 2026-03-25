import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Evita fallos por espacios al pegar en Vercel. */
function envTrim(name: string): string {
  const v = process.env[name];
  if (v == null) return "";
  return v.trim();
}

const secret =
  envTrim("AUTH_SECRET") ||
  envTrim("NEXTAUTH_SECRET");

const googleClientId =
  envTrim("AUTH_GOOGLE_ID") || envTrim("GOOGLE_CLIENT_ID");
const googleClientSecret =
  envTrim("AUTH_GOOGLE_SECRET") || envTrim("GOOGLE_CLIENT_SECRET");

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Obligatorio en producción. Si falta, Auth.js devuelve error=Configuration.
  secret: secret || undefined,
  debug: process.env.AUTH_DEBUG === "true",
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  // Sin BD: la app usa Google Sheets/Drive como “BD” de negocio.
  // Para Auth, usamos JWT para no requerir Prisma/Postgres.
  session: { strategy: "jwt" },
  trustHost: true,
});
