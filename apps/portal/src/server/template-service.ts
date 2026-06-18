import { prisma } from "@idportal/db";
import { NotFoundError } from "@idportal/api-kit";
import sharp from "sharp";
import { rasterizeTemplate } from "./template-converter";
import { parseTemplateLayoutJson } from "./template-layout";
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
  layoutJson: unknown;
  sourceWidth: number | null;
  sourceHeight: number | null;
  createdAt: Date;
  updatedAt: Date;
  school?: { id: string; name: string; code: string; accentColor: string };
}) {
  return {
    ...t,
    hasLayout: t.layoutJson != null,
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
  options?: {
    signature?: { buffer: Buffer; ext: string } | null;
    layoutJson?: unknown;
  },
) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const sourceMeta = await sharp(buffer).metadata();
  const sourceWidth = sourceMeta.width ?? null;
  const sourceHeight = sourceMeta.height ?? null;

  let layoutJson: unknown = null;
  if (options?.layoutJson != null) {
    layoutJson = {
      ...options.layoutJson,
      sourceWidth: (options.layoutJson as { sourceWidth?: number }).sourceWidth ?? sourceWidth,
      sourceHeight: (options.layoutJson as { sourceHeight?: number }).sourceHeight ?? sourceHeight,
    };
    parseTemplateLayoutJson(layoutJson);
  }

  const existing = await prisma.idCardTemplate.findUnique({ where: { schoolId } });
  const rasterBuffer = await rasterizeTemplate(buffer, format);
  const renderPath = `templates/${schoolId}/template.png`;
  const stored = await saveFile(renderPath, rasterBuffer);

  let sourcePath: string | null = null;
  if (!isRasterTemplateFormat(format)) {
    if (existing?.sourcePath) await deleteStorageFile(existing.sourcePath);
    sourcePath = await saveFile(`templates/${schoolId}/source.${format}`, buffer);
  } else if (existing?.sourcePath) {
    await deleteStorageFile(existing.sourcePath);
  }

  let signaturePath: string | undefined;
  if (options?.signature) {
    if (existing?.signaturePath) await deleteStorageFile(existing.signaturePath);
    signaturePath = await saveFile(
      `templates/${schoolId}/signature.${options.signature.ext}`,
      options.signature.buffer,
    );
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
      layoutJson: layoutJson ?? undefined,
      sourceWidth,
      sourceHeight,
    },
    update: {
      name,
      filePath: stored,
      sourcePath,
      sourceFormat: isRasterTemplateFormat(format) ? null : format,
      ...(signaturePath ? { signaturePath } : {}),
      ...(layoutJson != null ? { layoutJson } : {}),
      sourceWidth,
      sourceHeight,
    },
    include: { school: true },
  });

  return {
    ...mapTemplate(template),
    layoutWarning:
      layoutJson == null
        ? "No field layout uploaded — cards will use default positions and may misalign on custom artwork. Upload a .layout.json file."
        : null,
  };
}

export async function updateTemplateLayout(id: string, layoutJson: unknown) {
  const template = await prisma.idCardTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");

  parseTemplateLayoutJson({
    ...layoutJson,
    sourceWidth: (layoutJson as { sourceWidth?: number }).sourceWidth ?? template.sourceWidth,
    sourceHeight: (layoutJson as { sourceHeight?: number }).sourceHeight ?? template.sourceHeight,
  });

  const updated = await prisma.idCardTemplate.update({
    where: { id },
    data: { layoutJson },
    include: { school: true },
  });
  return mapTemplate(updated);
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
    return { templateBuffer: null, signatureBuffer: null, hasTemplate: false, layout: null };
  }

  const [templateBuffer, signatureBuffer] = await Promise.all([
    readStorageFile(template.filePath),
    template.signaturePath ? readStorageFile(template.signaturePath) : Promise.resolve(null),
  ]);

  let layout = null;
  if (template.layoutJson) {
    try {
      layout = parseTemplateLayoutJson({
        ...template.layoutJson,
        sourceWidth:
          (template.layoutJson as { sourceWidth?: number }).sourceWidth ?? template.sourceWidth,
        sourceHeight:
          (template.layoutJson as { sourceHeight?: number }).sourceHeight ?? template.sourceHeight,
      });
    } catch {
      layout = null;
    }
  }

  return { templateBuffer, signatureBuffer, hasTemplate: true, layout };
}

export async function loadTemplateBuffer(schoolId: string) {
  const { templateBuffer } = await loadTemplateAssets(schoolId);
  return templateBuffer;
}

export async function deleteTemplate(id: string) {
  const template = await prisma.idCardTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");
  await deleteStorageFile(template.filePath);
  if (template.sourcePath) await deleteStorageFile(template.sourcePath);
  if (template.signaturePath) await deleteStorageFile(template.signaturePath);
  await prisma.idCardTemplate.delete({ where: { id } });
  return { ok: true };
}
