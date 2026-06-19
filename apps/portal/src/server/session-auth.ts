import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@idportal/db";
import { ForbiddenError, UnauthorizedError } from "@idportal/api-kit";

export type PortalAuthUser = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

export const SESSION_COOKIE = "idportal_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_MS);
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function createSession(userId: string) {
  const expiresAt = sessionExpiry();
  const session = await prisma.session.create({
    data: {
      token: crypto.randomUUID(),
      userId,
      expiresAt,
    },
  });
  return { token: session.token, expiresAt };
}

export async function destroySession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function requireAuth(req: NextRequest): Promise<PortalAuthUser> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new UnauthorizedError();

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    throw new UnauthorizedError("Session expired — sign in again");
  }

  return {
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export function requireSuperAdmin(user: PortalAuthUser) {
  if (user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Only Super Admin can delete records");
  }
}

export function requireAdmin(user: PortalAuthUser) {
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
}
