import { compareSync } from "bcryptjs";
import { prisma } from "@idportal/db";
import { UnauthorizedError } from "@idportal/api-kit";
import type { LoginDto } from "@idportal/contracts";
import { createSession } from "./session-auth";

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user || !compareSync(dto.password, user.passwordHash)) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const session = await createSession(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    sessionToken: session.token,
    expiresAt: session.expiresAt,
  };
}
