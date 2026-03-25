import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    googleAccessToken?: string;
    googleRefreshToken?: string;
    /** Unix timestamp (seconds) cuando expira googleAccessToken */
    googleExpiresAt?: number;
  }
}
