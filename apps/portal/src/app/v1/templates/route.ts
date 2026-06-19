import type { NextRequest } from "next/server";
import { BadRequestError, withApi } from "@idportal/api-kit";
import { requireAuth } from "@/server/session-auth";

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
  const layoutFile = form.get("layout");

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

  let layoutJson: unknown;
  if (layoutFile instanceof File && layoutFile.size > 0) {
    try {
      layoutJson = JSON.parse(await layoutFile.text());
    } catch {
      throw new BadRequestError("Layout file must be valid JSON (.layout.json)");
    }
  }

  return templateService.uploadTemplate(schoolId, name.trim(), buffer, format, {
    signature: signatureInput,
    layoutJson,
  });
});
