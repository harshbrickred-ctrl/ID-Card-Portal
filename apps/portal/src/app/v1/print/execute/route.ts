import { NextResponse } from "next/server";
import { validateBody, withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";
import { PrintExecuteSchema } from "@idportal/contracts";
import * as printService from "@/server/print-service";

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const body = await validateBody(req, PrintExecuteSchema);
  const result = await printService.executePrint(
    body.schoolId,
    body.studentIds,
    body.filters,
    body.format,
  );

  const isPdf = result.format === "pdf";
  const payload = isPdf ? result.pdf! : result.zip!;
  const contentType = isPdf ? "application/pdf" : "application/zip";
  const ext = isPdf ? "pdf" : "zip";

  return new NextResponse(new Uint8Array(payload), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="id-cards-${result.jobId}.${ext}"`,
      "X-Card-Count": String(result.cardCount),
      "X-Job-Id": result.jobId,
      "X-Print-Format": result.format,
    },
  });
});
