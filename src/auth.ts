import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  // Sin BD: la app usa Google Sheets/Drive como “BD” de negocio.
  // Para Auth, usamos JWT para no requerir Prisma/Postgres.
  session: { strategy: "jwt" },
  trustHost: true,
});
