import { compareSync, hashSync } from "bcryptjs";
import { prisma } from "@idportal/db";
import { signPortalToken } from "@idportal/api-kit";
import type { LoginDto, SignupDto } from "@idportal/contracts";
import { BadRequestError, UnauthorizedError } from "@idportal/api-kit";

export async function signup(dto: SignupDto) {
  const existing = await prisma.portalUser.findUnique({ where: { email: dto.email } });
  if (existing) throw new BadRequestError("Email already registered");

  const user = await prisma.portalUser.create({
    data: {
      email: dto.email,
      name: dto.name,
      passwordHash: hashSync(dto.password, 10),
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: dto.organizationName,
      members: { create: { userId: user.id, role: "OWNER" } },
      integrations: { create: { source: "manual" } },
    },
  });

  const token = await signPortalToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    organizationId: org.id,
    role: "OWNER",
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
    organization: { id: org.id, name: org.name, plan: org.plan },
  };
}

export async function login(dto: LoginDto) {
  const user = await prisma.portalUser.findUnique({
    where: { email: dto.email },
    include: {
      memberships: { include: { organization: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!user || !compareSync(dto.password, user.passwordHash)) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const membership = user.memberships[0];
  if (!membership) throw new BadRequestError("No organization linked to this account");

  const token = await signPortalToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    organizationId: membership.organizationId,
    role: membership.role,
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
    organization: {
      id: membership.organization.id,
      name: membership.organization.name,
      plan: membership.organization.plan,
    },
  };
}
