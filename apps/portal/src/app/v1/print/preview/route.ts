import { validateBody, withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";
import { PrintPreviewSchema } from "@idportal/contracts";
import * as printService from "@/server/print-service";

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const body = await validateBody(req, PrintPreviewSchema);
  return printService.previewCards(body.schoolId, body.studentIds, body.filters);
});
