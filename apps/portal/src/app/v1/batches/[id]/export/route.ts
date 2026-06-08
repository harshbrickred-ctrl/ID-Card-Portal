import { NextResponse } from "next/server";
import { withApi, requireAuth } from "@idportal/api-kit";
import * as batchService from "@/server/batch-service";

export const runtime = "nodejs";
export const maxDuration = 120;

export const GET = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  const { id } = await ctx.params;
  const { buffer, filename } = await batchService.exportBatchZip(
    user.organizationId,
    id,
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
