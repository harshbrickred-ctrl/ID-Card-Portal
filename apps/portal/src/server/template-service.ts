import { prisma } from "@idportal/db";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";
import { TemplateLayoutSchema, type TemplateLayoutDto } from "@idportal/contracts";
import { renderStudentCard } from "@idportal/card-engine";
import sharp from "sharp";
import { rasterizeTemplate } from "./template-converter";
import { parseTemplateLayoutJson } from "./template-layout";
import { deleteStorageFile, publicFileUrl, readStorageFile, saveFile, versionedPublicUrl } from "./storage";
import type { TemplateSourceFormat } from "./template-utils";
import { isRasterTemplateFormat } from "./template-utils";
import { loadStudentPhotoBuffer } from "./student-service";
import { remapLayoutDimensions } from "./layout-coordinates";

/** Re-rasterize PDF templates that were previously cropped to CR-80 for the layout editor. */
async function ensureFullPageTemplateRaster(template: {
  id: string;
  filePath: string;
  sourcePath: string | null;
  sourceFormat: string | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  layoutJson: unknown;
  updatedAt: Date;
}): Promise<{ width: number; height: number; repaired: boolean; layoutJson: unknown } | null> {
  if (template.sourceFormat !== "pdf" || !template.sourcePath) return null;

  const sourceBuffer = await readStorageFile(template.sourcePath);
  if (!sourceBuffer) return null;

  const fullRaster = await rasterizeTemplate(sourceBuffer, "pdf");
  const fullMeta = await sharp(fullRaster).metadata();
  const fullWidth = fullMeta.width ?? 0;
  const fullHeight = fullMeta.height ?? 0;
  if (fullWidth <= 0 || fullHeight <= 0) return null;

  const currentBuffer = await readStorageFile(template.filePath);
  if (!currentBuffer) return null;
  const currentMeta = await sharp(currentBuffer).metadata();
  const currentWidth = currentMeta.width ?? 0;
  const currentHeight = currentMeta.height ?? 0;

  if (currentWidth === fullWidth && currentHeight === fullHeight) {
    return { width: fullWidth, height: fullHeight, repaired: false, layoutJson: template.layoutJson };
  }

  await saveFile(template.filePath, fullRaster);

  const fromW = template.sourceWidth ?? currentWidth;
  const fromH = template.sourceHeight ?? currentHeight;
  let layoutJson = template.layoutJson;
  if (layoutJson != null && fromW > 0 && fromH > 0) {
    layoutJson = remapLayoutDimensions(
      layoutJson as TemplateLayoutDto,
      fromW,
      fromH,
      fullWidth,
      fullHeight,
    );
    parseTemplateLayoutJson(layoutJson);
  }

  await prisma.idCardTemplate.update({
    where: { id: template.id },
    data: {
      sourceWidth: fullWidth,
      sourceHeight: fullHeight,
      ...(layoutJson != null ? { layoutJson } : {}),
    },
  });

  return { width: fullWidth, height: fullHeight, repaired: true, layoutJson };
}

async function readRenderedTemplateDimensions(
  filePath: string,
  options?: { sourcePath?: string | null; sourceFormat?: string | null },
) {
  const buffer = await readStorageFile(filePath);
  if (!buffer) throw new NotFoundError("Template file not found");

  try {
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
  } catch {
    /* fall through — may need repair from PDF source */
  }

  if (options?.sourcePath && options.sourceFormat === "pdf") {
    const sourceBuffer = await readStorageFile(options.sourcePath);
    if (sourceBuffer) {
      const raster = await rasterizeTemplate(sourceBuffer, "pdf");
      await saveFile(filePath, raster);
      const meta = await sharp(raster).metadata();
      return {
        width: meta.width ?? 1011,
        height: meta.height ?? 638,
      };
    }
  }

  throw new BadRequestError(
    "Template preview image is invalid. Delete this template and upload a PNG or JPG again.",
  );
}
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
    fileUrl: versionedPublicUrl(t.filePath, t.updatedAt),
    sourceUrl: t.sourcePath ? versionedPublicUrl(t.sourcePath, t.updatedAt) : null,
    signatureUrl: t.signaturePath ? versionedPublicUrl(t.signaturePath, t.updatedAt) : null,
    layoutJson: t.layoutJson,
    sourceWidth: t.sourceWidth,
    sourceHeight: t.sourceHeight,
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
  },
) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  let uploadWidth: number | null = null;
  let uploadHeight: number | null = null;
  if (isRasterTemplateFormat(format)) {
    const sourceMeta = await sharp(buffer).metadata();
    uploadWidth = sourceMeta.width ?? null;
    uploadHeight = sourceMeta.height ?? null;
  }

  const existing = await prisma.idCardTemplate.findUnique({ where: { schoolId } });

  let sourcePath: string | null = null;
  if (!isRasterTemplateFormat(format)) {
    if (existing?.sourcePath) await deleteStorageFile(existing.sourcePath);
    sourcePath = await saveFile(`templates/${schoolId}/source.${format}`, buffer);
  } else if (existing?.sourcePath) {
    await deleteStorageFile(existing.sourcePath);
  }

  const rasterBuffer = await rasterizeTemplate(buffer, format);
  const rasterMeta = await sharp(rasterBuffer).metadata();
  const sourceWidth = rasterMeta.width ?? uploadWidth;
  const sourceHeight = rasterMeta.height ?? uploadHeight;

  const renderPath = `templates/${schoolId}/template.png`;
  if (existing?.filePath) await deleteStorageFile(existing.filePath);
  const stored = await saveFile(renderPath, rasterBuffer);

  let sourcePathStored: string | null = sourcePath;

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
      sourcePath: sourcePathStored,
      sourceFormat: isRasterTemplateFormat(format) ? null : format,
      signaturePath: signaturePath ?? null,
      sourceWidth,
      sourceHeight,
    },
    update: {
      name,
      filePath: stored,
      sourcePath: sourcePathStored,
      sourceFormat: isRasterTemplateFormat(format) ? null : format,
      ...(signaturePath ? { signaturePath } : {}),
      sourceWidth,
      sourceHeight,
    },
    include: { school: true },
  });

  return mapTemplate(template);
}

export async function getTemplateById(id: string) {
  const template = await prisma.idCardTemplate.findUnique({
    where: { id },
    include: { school: { select: { id: true, name: true, code: true, accentColor: true, academicYear: true } } },
  });
  if (!template) throw new NotFoundError("Template not found");

  const repaired = await ensureFullPageTemplateRaster(template);
  const dimensions = repaired
    ? { width: repaired.width, height: repaired.height }
    : await readRenderedTemplateDimensions(template.filePath, {
        sourcePath: template.sourcePath,
        sourceFormat: template.sourceFormat,
      });

  const effectiveLayoutJson = repaired?.layoutJson ?? template.layoutJson;
  const layoutJson = normalizeLayoutForPrintFile(
    effectiveLayoutJson,
    dimensions.width,
    dimensions.height,
    dimensions.width,
    dimensions.height,
  );

  return {
    ...mapTemplate({
      ...template,
      layoutJson: layoutJson ?? effectiveLayoutJson,
      sourceWidth: dimensions.width,
      sourceHeight: dimensions.height,
      updatedAt: repaired?.repaired ? new Date() : template.updatedAt,
    }),
    dimensions,
    layoutRepaired: repaired?.repaired ?? false,
  };
}

export async function updateTemplateLayout(id: string, layoutJson: unknown) {
  const template = await prisma.idCardTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");

  const printDims = await readRenderedTemplateDimensions(template.filePath, {
    sourcePath: template.sourcePath,
    sourceFormat: template.sourceFormat,
  });
  const raw = layoutJson as TemplateLayoutDto;
  const fromW = raw.sourceWidth ?? template.sourceWidth ?? printDims.width;
  const fromH = raw.sourceHeight ?? template.sourceHeight ?? printDims.height;
  const remapped = remapLayoutDimensions(raw, fromW, fromH, printDims.width, printDims.height);

  const validated = TemplateLayoutSchema.parse(remapped);
  parseTemplateLayoutJson(validated);

  const updated = await prisma.idCardTemplate.update({
    where: { id },
    data: {
      layoutJson: validated,
      sourceWidth: printDims.width,
      sourceHeight: printDims.height,
    },
    include: { school: true },
  });
  return mapTemplate(updated);
}

export async function previewTemplateLayout(
  id: string,
  layoutJson: unknown,
  studentId?: string,
) {
  const template = await prisma.idCardTemplate.findUnique({
    where: { id },
    include: { school: true },
  });
  if (!template) throw new NotFoundError("Template not found");

  const printDims = await readRenderedTemplateDimensions(template.filePath, {
    sourcePath: template.sourcePath,
    sourceFormat: template.sourceFormat,
  });
  const normalized = normalizeLayoutForPrintFile(
    layoutJson,
    printDims.width,
    printDims.height,
    template.sourceWidth,
    template.sourceHeight,
  );
  if (!normalized) throw new BadRequestError("Layout is required");
  const layout = parseTemplateLayoutJson(normalized);

  const student = studentId
    ? await prisma.student.findFirst({ where: { id: studentId, schoolId: template.schoolId } })
    : await prisma.student.findFirst({
        where: { schoolId: template.schoolId },
        orderBy: { name: "asc" },
      });

  if (!student) {
    throw new BadRequestError("Add at least one student to this school before previewing the layout.");
  }

  const [templateBuffer, signatureBuffer, photoBuffer] = await Promise.all([
    readStorageFile(template.filePath),
    template.signaturePath ? readStorageFile(template.signaturePath) : Promise.resolve(null),
    loadStudentPhotoBuffer(student.photoUrl),
  ]);

  const front = await renderStudentCard({
    student: {
      enrollId: student.enrollId,
      name: student.name,
      firstName: student.firstName,
      lastName: student.lastName,
      class: student.class,
      section: student.section,
      dob: student.dob,
      phoneNumber: student.phoneNumber,
      address: student.address,
      photoBuffer,
    },
    school: {
      name: template.school.name,
      code: template.school.code,
      accentColor: template.school.accentColor,
      academicYear: template.school.academicYear,
    },
    templateBuffer,
    signatureBuffer,
    layout,
  });

  return {
    previewFront: `data:image/png;base64,${front.toString("base64")}`,
    studentName: student.name,
    enrollId: student.enrollId,
  };
}

export async function getTemplateImageDimensions(id: string) {
  const template = await prisma.idCardTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");

  const printDims = await readRenderedTemplateDimensions(template.filePath, {
    sourcePath: template.sourcePath,
    sourceFormat: template.sourceFormat,
  });

  if (template.sourceWidth !== printDims.width || template.sourceHeight !== printDims.height) {
    await prisma.idCardTemplate.update({
      where: { id },
      data: { sourceWidth: printDims.width, sourceHeight: printDims.height },
    });
  }

  return printDims;
}

export function normalizeLayoutForPrintFile(
  layoutJson: unknown,
  printWidth: number,
  printHeight: number,
  storedWidth?: number | null,
  storedHeight?: number | null,
): TemplateLayoutDto | null {
  if (layoutJson == null) return null;
  const raw = TemplateLayoutSchema.parse(layoutJson);
  const fromW = raw.sourceWidth ?? storedWidth ?? printWidth;
  const fromH = raw.sourceHeight ?? storedHeight ?? printHeight;
  if (fromW === printWidth && fromH === printHeight) return raw;
  return remapLayoutDimensions(raw, fromW, fromH, printWidth, printHeight);
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
    return { templateBuffer: null, signatureBuffer: null, hasTemplate: false, layout: null, layoutInvalid: false };
  }

  const repaired = await ensureFullPageTemplateRaster(template);

  const [templateBuffer, signatureBuffer] = await Promise.all([
    readStorageFile(template.filePath),
    template.signaturePath ? readStorageFile(template.signaturePath) : Promise.resolve(null),
  ]);

  const printDims = repaired
    ? { width: repaired.width, height: repaired.height }
    : await readRenderedTemplateDimensions(template.filePath, {
        sourcePath: template.sourcePath,
        sourceFormat: template.sourceFormat,
      });

  const layoutJson = repaired?.layoutJson ?? template.layoutJson;

  let layout = null;
  let layoutInvalid = false;
  if (layoutJson) {
    try {
      const normalized = normalizeLayoutForPrintFile(
        layoutJson,
        printDims.width,
        printDims.height,
        template.sourceWidth,
        template.sourceHeight,
      );
      if (normalized) {
        layout = parseTemplateLayoutJson(normalized);
      }
    } catch (err) {
      console.error("[loadTemplateAssets] Invalid layout JSON:", err);
      layoutInvalid = true;
      layout = null;
    }
  }

  return { templateBuffer, signatureBuffer, hasTemplate: true, layout, layoutInvalid };
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
