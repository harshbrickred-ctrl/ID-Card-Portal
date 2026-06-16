import type { NextRequest } from "next/server";
import { BadRequestError, requireAuth, withApi } from "@idportal/api-kit";

export const maxDuration = 120;
import { resolveImageExtension } from "@/server/image-utils";
import { resolveTemplateFormat } from "@/server/template-utils";
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
  const signature = form.get("signature");

  if (typeof schoolId !== "string") throw new BadRequestError("schoolId is required");
  if (typeof name !== "string" || !name.trim()) throw new BadRequestError("Template name is required");
  if (!(file instanceof File) || file.size === 0) throw new BadRequestError("Template file is required");

  const format = resolveTemplateFormat(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  let signatureInput: { buffer: Buffer; ext: string } | null = null;
  if (signature instanceof File && signature.size > 0) {
    signatureInput = {
      buffer: Buffer.from(await signature.arrayBuffer()),
      ext: resolveImageExtension(signature),
    };
  }

  return templateService.uploadTemplate(schoolId, name.trim(), buffer, format, signatureInput);
});
