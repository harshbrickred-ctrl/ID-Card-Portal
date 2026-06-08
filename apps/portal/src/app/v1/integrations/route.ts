import { prisma } from "@idportal/db";
import { withApi, requireAuth } from "@idportal/api-kit";

export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  const integrations = await prisma.integration.findMany({
    where: { organizationId: user.organizationId },
    select: {
      id: true,
      source: true,
      externalOrgId: true,
      apiBaseUrl: true,
      lastSyncAt: true,
      apiKeyEnc: false,
    },
  });
  return integrations;
});
