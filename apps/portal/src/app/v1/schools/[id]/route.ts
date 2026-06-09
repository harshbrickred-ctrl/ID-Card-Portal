import { requireAuth, requireSuperAdmin, withApi } from "@idportal/api-kit";
import * as schoolService from "@/server/school-service";

export const GET = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(req);
  const { id } = await ctx.params;
  return schoolService.getSchool(id);
});

export const DELETE = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  requireSuperAdmin(auth);
  const { id } = await ctx.params;
  return schoolService.deleteSchool(id);
});
