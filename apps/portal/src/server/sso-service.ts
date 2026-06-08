import { randomBytes } from "crypto";
import { hashSync } from "bcryptjs";
import { prisma } from "@idportal/db";
import { signPortalToken, verifySsoToken } from "@idportal/api-kit";
import type { SsoConnectClaims } from "@idportal/contracts";

function mapSource(source: SsoConnectClaims["source"]) {
  return source === "school-erp" ? "school_erp" : "vetan";
}

export async function handleSsoConnect(source: string, token: string) {
  const claims = await verifySsoToken(source, token);

  let user = await prisma.portalUser.findUnique({ where: { email: claims.email } });
  if (!user) {
    user = await prisma.portalUser.create({
      data: {
        email: claims.email,
        name: claims.name,
        passwordHash: hashSync(randomBytes(32).toString("hex"), 10),
      },
    });
  }

  let org = await prisma.organization.findFirst({
    where: {
      integrations: {
        some: {
          source: mapSource(claims.source),
          externalOrgId: claims.externalOrgId,
        },
      },
    },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: claims.orgName,
        members: {
          create: {
            userId: user.id,
            role: claims.permissions.includes("id-cards:write") ? "ADMIN" : "VIEWER",
          },
        },
        integrations: {
          create: {
            source: mapSource(claims.source),
            externalOrgId: claims.externalOrgId,
            apiBaseUrl: claims.apiBaseUrl,
          },
        },
      },
    });
  } else {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: user.id },
      },
      create: {
        organizationId: org.id,
        userId: user.id,
        role: claims.permissions.includes("id-cards:write") ? "ADMIN" : "VIEWER",
      },
      update: {},
    });
    await prisma.integration.updateMany({
      where: { organizationId: org.id, source: mapSource(claims.source) },
      data: { apiBaseUrl: claims.apiBaseUrl, externalOrgId: claims.externalOrgId },
    });
  }

  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
  });

  const portalToken = await signPortalToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    organizationId: org.id,
    role: membership?.role ?? "VIEWER",
  });

  return { token: portalToken, organizationId: org.id };
}
