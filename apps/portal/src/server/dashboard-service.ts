import { prisma } from "@idportal/db";

export async function getDashboard(organizationId: string) {
  const [org, employeeCount, missingPhotos, lastBatch, integration] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.employeeSnapshot.count({ where: { organizationId } }),
    prisma.employeeSnapshot.count({
      where: {
        organizationId,
        photoUrl: null,
        photoOverride: null,
      },
    }),
    prisma.printBatch.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.integration.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    organization: org,
    employeeCount,
    missingPhotos,
    lastBatch,
    integration,
  };
}
