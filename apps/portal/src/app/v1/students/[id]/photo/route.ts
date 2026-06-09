import { BadRequestError, requireAuth, withApi } from "@idportal/api-kit";
import * as studentService from "@/server/student-service";

export const POST = withApi(async (req, ctx: { params: Promise<{ id: string }> }) => {
  await requireAuth(req);
  const { id } = await ctx.params;
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) throw new BadRequestError("Photo file is required");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    throw new BadRequestError("Photo must be JPG, PNG, or WebP");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return studentService.saveStudentPhoto(id, buffer, ext === "jpeg" ? "jpg" : ext);
});
