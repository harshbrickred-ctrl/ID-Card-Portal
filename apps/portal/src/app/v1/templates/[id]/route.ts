import { requireAdmin, requireAuth, validateBody, withApi } from "@idportal/api-kit";
import { TemplateLayoutSchema } from "@idportal/contracts";
import * as templateService from "@/server/template-service";

export const PATCH = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  requireAdmin(auth);
  const { id } = await ctx.params;
  const body = await validateBody(req, TemplateLayoutSchema);
  return templateService.updateTemplateLayout(id, body);
});

export const DELETE = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  requireAdmin(auth);
  const { id } = await ctx.params;
  return templateService.deleteTemplate(id);
});
