import { prisma } from "@idportal/db";
import { withApi, requireAuth, validateBody } from "@idportal/api-kit";
import { CreateBatchSchema } from "@idportal/contracts";
import * as batchService from "@/server/batch-service";

export const runtime = "nodejs";

export const GET = withApi(async (req) => {
  const user = await requireAuth(req);
  const batches = await prisma.printBatch.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return batches;
});

export const POST = withApi(async (req) => {
  const user = await requireAuth(req);
  const body = await validateBody(req, CreateBatchSchema);
  return batchService.createBatch(user.organizationId, user.sub, body);
});
