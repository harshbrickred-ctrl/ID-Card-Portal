import type { NextRequest } from "next/server";
import { BadRequestError, requireAuth, withApi } from "@idportal/api-kit";
import * as templateService from "@/server/template-service";

export const GET = withApi(async (req: NextRequest) => {
  await requireAuth(req);
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  if (schoolId) return templateService.getTemplateForSchool(schoolId);
  return templateService.listTemplates();
});

export const POST = withApi(async (req) => {
  await requireAuth(req);
  const form = await req.formData();
  const schoolId = form.get("schoolId");
  const name = form.get("name");
  const file = form.get("file");
  if (typeof schoolId !== "string") throw new BadRequestError("schoolId is required");
  if (typeof name !== "string" || !name.trim()) throw new BadRequestError("Template name is required");
  if (!(file instanceof File)) throw new BadRequestError("Template image is required");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    throw new BadRequestError("Template must be JPG, PNG, or WebP");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return templateService.uploadTemplate(schoolId, name.trim(), buffer, ext === "jpeg" ? "jpg" : ext);
});
