import { NextResponse } from "next/server";
import { requireAuth, validateBody, withApi } from "@idportal/api-kit";
import { PrintExecuteSchema } from "@idportal/contracts";
import * as printService from "@/server/print-service";

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const body = await validateBody(req, PrintExecuteSchema);
  const { zip, jobId, cardCount } = await printService.executePrint(
    body.schoolId,
    body.studentIds,
    body.filters,
  );

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="id-cards-${jobId}.zip"`,
      "X-Card-Count": String(cardCount),
      "X-Job-Id": jobId,
    },
  });
});
