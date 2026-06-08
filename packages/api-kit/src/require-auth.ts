import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { ForbiddenError, UnauthorizedError } from "./errors";

export type PortalTokenPayload = {
  sub: string;
  email: string;
  name: string;
  organizationId: string;
  role: string;
};

const encoder = new TextEncoder();

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return encoder.encode(secret);
}

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export async function signPortalToken(
  payload: Omit<PortalTokenPayload, "iat" | "exp">,
  expiresIn = "7d",
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function requireAuth(req: NextRequest): Promise<PortalTokenPayload> {
  const token = extractBearer(req);
  if (!token) throw new UnauthorizedError();
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      organizationId: String(payload.organizationId),
      role: String(payload.role),
    };
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export function requireRole(user: PortalTokenPayload, roles: string[]) {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError("Insufficient role");
  }
}
