import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "";

const googleClientId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Obligatorio en producción; Vercel a veces usa NEXTAUTH_SECRET.
  secret: secret || undefined,
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
