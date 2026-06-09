import { requireAuth, validateBody, withApi } from "@idportal/api-kit";
import { PrintPreviewSchema } from "@idportal/contracts";
import * as printService from "@/server/print-service";

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const body = await validateBody(req, PrintPreviewSchema);
  return printService.previewCards(body.schoolId, body.studentIds);
});
