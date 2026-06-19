import { validateBody, withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";
import { TemplateLayoutPreviewSchema } from "@idportal/contracts";
import * as templateService from "@/server/template-service";

export const POST = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(req);
  const { id } = await ctx.params;
  const body = await validateBody(req, TemplateLayoutPreviewSchema);
  return templateService.previewTemplateLayout(id, body.layout, body.studentId);
});
