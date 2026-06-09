import { prisma } from "@idportal/db";
import { NotFoundError } from "@idportal/api-kit";
import { publicFileUrl, readStorageFile, saveFile } from "./storage";

export async function listTemplates() {
  const templates = await prisma.idCardTemplate.findMany({
    include: { school: { select: { id: true, name: true, code: true, accentColor: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return templates.map((t) => ({
    ...t,
    fileUrl: publicFileUrl(t.filePath),
  }));
}

export async function uploadTemplate(schoolId: string, name: string, buffer: Buffer, ext: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const relPath = `templates/${schoolId}/template.${ext}`;
  await saveFile(relPath, buffer);

  const template = await prisma.idCardTemplate.upsert({
    where: { schoolId },
    create: { schoolId, name, filePath: relPath },
    update: { name, filePath: relPath },
  });

  return {
    ...template,
    fileUrl: publicFileUrl(relPath),
    school,
  };
}

export async function getTemplateForSchool(schoolId: string) {
  const template = await prisma.idCardTemplate.findUnique({
    where: { schoolId },
    include: { school: true },
  });
  if (!template) return null;
  return { ...template, fileUrl: publicFileUrl(template.filePath) };
}

export async function loadTemplateBuffer(schoolId: string) {
  const template = await prisma.idCardTemplate.findUnique({ where: { schoolId } });
  if (!template) return null;
  return readStorageFile(template.filePath);
}

export async function deleteTemplate(id: string) {
  const template = await prisma.idCardTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("Template not found");
  await prisma.idCardTemplate.delete({ where: { id } });
  return { ok: true };
}
