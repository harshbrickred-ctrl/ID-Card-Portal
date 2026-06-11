import { prisma } from "@idportal/db";
import { NotFoundError } from "@idportal/api-kit";
import { rasterizeTemplate } from "./template-converter";
import { deleteStorageFile, publicFileUrl, readStorageFile, saveFile } from "./storage";
import type { TemplateSourceFormat } from "./template-utils";
import { isRasterTemplateFormat } from "./template-utils";

function mapTemplate(t: {
  id: string;
  schoolId: string;
  name: string;
  filePath: string;
  sourcePath: string | null;
  sourceFormat: string | null;
  signaturePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  school?: { id: string; name: string; code: string; accentColor: string };
}) {
  return {
    ...t,
    fileUrl: publicFileUrl(t.filePath),
    sourceUrl: t.sourcePath ? publicFileUrl(t.sourcePath) : null,
    signatureUrl: t.signaturePath ? publicFileUrl(t.signaturePath) : null,
  };
}

export async function listTemplates() {
  const templates = await prisma.idCardTemplate.findMany({
    include: { school: { select: { id: true, name: true, code: true, accentColor: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return templates.map(mapTemplate);
}

export async function uploadTemplate(
  schoolId: string,
  name: string,
  buffer: Buffer,
  format: TemplateSourceFormat,
  signature?: { buffer: Buffer; ext: string } | null,
  preview?: { buffer: Buffer; format: TemplateSourceFormat } | null,
) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const existing = await prisma.idCardTemplate.findUnique({ where: { schoolId } });
  const rasterBuffer = await rasterizeTemplate(buffer, format, preview);
  const renderPath = `templates/${schoolId}/template.png`;
  const stored = await saveFile(renderPath, rasterBuffer);

  let sourcePath: string | null = null;
  if (!isRasterTemplateFormat(format)) {
    if (existing?.sourcePath) {
      await deleteStorageFile(existing.sourcePath);
    }
    const sourceRel = `templates/${schoolId}/source.${format}`;
    sourcePath = await saveFile(sourceRel, buffer);
  } else if (existing?.sourcePath) {
    await deleteStorageFile(existing.sourcePath);
  }

  let signaturePath: string | undefined;
  if (signature) {
    if (existing?.signaturePath) {
      await deleteStorageFile(existing.signaturePath);
    }
    const sigRel = `templates/${schoolId}/signature.${signature.ext}`;
    signaturePath = await saveFile(sigRel, signature.buffer);
  }

  const template = await prisma.idCardTemplate.upsert({
    where: { schoolId },
    create: {
      schoolId,
      name,
      filePath: stored,
      sourcePath,
      sourceFormat: isRasterTemplateFormat(format) ? null : format,
      signaturePath: signaturePath ?? null,
    },
    update: {
      name,
      filePath: stored,
      sourcePath,
      sourceFormat: isRasterTemplateFormat(format) ? null : format,
      ...(signaturePath ? { signaturePath } : {}),
    },
    include: { school: true },
  });

  return mapTemplate(template);
}

export async function getTemplateForSchool(schoolId: string) {
  const template = await prisma.idCardTemplate.findUnique({
    where: { schoolId },
    include: { school: true },
  });
  if (!template) return null;
  return mapTemplate(template);
}

export async function loadTemplateAssets(schoolId: string) {
  const template = await prisma.idCardTemplate.findUnique({ where: { schoolId } });
  if (!template) {
    return { templateBuffer: null, signatureBuffer: null, hasTemplate: false };
  }

  const [templateBuffer, signatureBuffer] = await Promise.all([
    readStorageFile(template.filePath),
    template.signaturePath ? readStorageFile(template.signaturePath) : Promise.resolve(null),
  ]);

  return { templateBuffer, signatureBuffer, hasTemplate: true };
}

/** @deprecated Use loadTemplateAssets */
export async function loadTemplateBuffer(schoolId: string) {
  const { templateBuffer } = await loadTemplateAssets(schoolId);
  return templateBuffer;
}

export async function deleteTemplate(id: string) {
  const template = await prisma.idCardTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");
  await deleteStorageFile(template.filePath);
  if (template.sourcePath) {
    await deleteStorageFile(template.sourcePath);
  }
  if (template.signaturePath) {
    await deleteStorageFile(template.signaturePath);
  }
  await prisma.idCardTemplate.delete({ where: { id } });
  return { ok: true };
}
