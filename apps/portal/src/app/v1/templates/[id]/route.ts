import { requireAdmin, requireAuth, withApi } from "@idportal/api-kit";
import * as templateService from "@/server/template-service";

export const DELETE = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  requireAdmin(auth);
  const { id } = await ctx.params;
  return templateService.deleteTemplate(id);
});
