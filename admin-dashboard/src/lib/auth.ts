import { jwtVerify } from "jose";

export type UserRole = "superadmin" | "admin" | "reviewer" | "agent" | "borrower";

function getJwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "dev_only_change_me");
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as {
    sub: string;
    role?: UserRole;
    exp?: number;
    iat?: number;
  };
}
