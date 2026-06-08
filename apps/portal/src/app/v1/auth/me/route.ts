import { prisma } from "@idportal/db";
import { withApi, requireAuth } from "@idportal/api-kit";

export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  const [portalUser, org, membership] = await Promise.all([
    prisma.portalUser.findUnique({ where: { id: user.sub } }),
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: user.sub,
        },
      },
    }),
  ]);
  return {
    user: {
      id: user.sub,
      email: user.email,
      name: portalUser?.name ?? user.name,
    },
    organization: org
      ? { id: org.id, name: org.name, plan: org.plan }
      : null,
    role: membership?.role ?? user.role,
  };
});
