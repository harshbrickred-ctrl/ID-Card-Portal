import { validateBody, withApi } from "@idportal/api-kit";
import { requireAuth, requireSuperAdmin } from "@/server/session-auth";
import { StudentUpdateSchema } from "@idportal/contracts";
import * as studentService from "@/server/student-service";

export const PATCH = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(req);
  const { id } = await ctx.params;
  const body = await validateBody(req, StudentUpdateSchema);
  return studentService.updateStudent(id, body);
});

export const DELETE = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireAuth(req);
  requireSuperAdmin(auth);
  const { id } = await ctx.params;
  return studentService.deleteStudent(id);
});
