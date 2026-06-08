import { prisma } from "@idportal/db";
import { withApi, requireAuth } from "@idportal/api-kit";

export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  const employees = await prisma.employeeSnapshot.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return employees;
});
