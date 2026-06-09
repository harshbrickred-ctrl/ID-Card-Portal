import { compareSync } from "bcryptjs";
import { prisma } from "@idportal/db";
import { signPortalToken, UnauthorizedError } from "@idportal/api-kit";
import type { LoginDto } from "@idportal/contracts";

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user || !compareSync(dto.password, user.passwordHash)) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = await signPortalToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
