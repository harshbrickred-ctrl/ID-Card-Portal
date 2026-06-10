import { BadRequestError, requireAuth, withApi } from "@idportal/api-kit";
import { resolveImageExtension } from "@/server/image-utils";
import * as studentService from "@/server/student-service";

export const POST = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(req);
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new BadRequestError("Photo file is required");

  const ext = resolveImageExtension(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return studentService.saveStudentPhoto(id, buffer, ext);
});
