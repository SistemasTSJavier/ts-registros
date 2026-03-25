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
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  // Sin BD: la app usa Google Sheets/Drive como “BD” de negocio.
  // Para Auth, usamos JWT para no requerir Prisma/Postgres.
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (user?.email) {
        token.email = user.email;
      }
      const p = profile as { email?: string } | null | undefined;
      if (!token.email && typeof p?.email === "string") {
        token.email = p.email;
      }
      if (account) {
        if (typeof account.access_token === "string") {
          token.googleAccessToken = account.access_token;
        }
        if (typeof account.refresh_token === "string") {
          token.googleRefreshToken = account.refresh_token;
        }
        if (typeof account.expires_at === "number") {
          token.googleExpiresAt = account.expires_at;
        } else if (typeof account.expires_in === "number") {
          token.googleExpiresAt =
            Math.floor(Date.now() / 1000) + account.expires_in;
        }
      }
      return token;
    },
  },
});
