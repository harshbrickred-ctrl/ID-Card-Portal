import { validateBody, withApi } from "@idportal/api-kit";
import { requireAdmin, requireAuth } from "@/server/session-auth";
import { TemplateLayoutSchema } from "@idportal/contracts";
import * as templateService from "@/server/template-service";

export const GET = withApi(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(_req);
  const { id } = await ctx.params;
  const [template, dimensions] = await Promise.all([
    templateService.getTemplateById(id),
    templateService.getTemplateImageDimensions(id),
  ]);
  return { ...template, dimensions };
});

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
