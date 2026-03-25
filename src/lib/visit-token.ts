import { randomBytes } from "crypto";

export function newApprovalToken(): string {
  return randomBytes(32).toString("base64url");
}
