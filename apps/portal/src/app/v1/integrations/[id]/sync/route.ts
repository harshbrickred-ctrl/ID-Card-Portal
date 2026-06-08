import { withApi, requireAuth, validateBody } from "@idportal/api-kit";
import { z } from "zod";
import * as syncService from "@/server/sync-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const SyncBodySchema = z.object({
  apiKey: z.string().min(8).optional(),
});

export const POST = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  const { id } = await ctx.params;
  const body = await validateBody(req, SyncBodySchema);
  return syncService.syncIntegration(user.organizationId, id, body.apiKey);
});
