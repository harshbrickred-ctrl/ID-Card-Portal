import type { NextRequest } from "next/server";
import { BadRequestError, requireAuth, withApi } from "@idportal/api-kit";

export const maxDuration = 120;
import { resolveImageExtension } from "@/server/image-utils";
import { getCdrConversionCapabilities } from "@/server/cdr-converter";
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

  const previewFile = form.get("preview");
  let previewInput: { buffer: Buffer; format: ReturnType<typeof resolveTemplateFormat> } | null = null;
  if (previewFile instanceof File && previewFile.size > 0) {
    const previewFormat = resolveTemplateFormat(previewFile);
    if (previewFormat === "cdr") {
      throw new BadRequestError("Print-ready preview must be PNG, JPG, WebP, or PDF — not CDR");
    }
    previewInput = {
      buffer: Buffer.from(await previewFile.arrayBuffer()),
      format: previewFormat,
    };
  } else if (format === "cdr" && getCdrConversionCapabilities().cdrNeedsFallback) {
    throw new BadRequestError(
      "CDR upload on cloud requires a PNG or PDF export from CorelDRAW, or CONVERTAPI_SECRET in environment variables.",
    );
  }

  let signatureInput: { buffer: Buffer; ext: string } | null = null;
  if (signature instanceof File && signature.size > 0) {
    signatureInput = {
      buffer: Buffer.from(await signature.arrayBuffer()),
      ext: resolveImageExtension(signature),
    };
  }

  return templateService.uploadTemplate(schoolId, name.trim(), buffer, format, signatureInput, previewInput);
});
