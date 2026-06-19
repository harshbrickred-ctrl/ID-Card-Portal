import { prisma } from "@idportal/db";
import type { SchoolDto, SchoolUpdateDto } from "@idportal/contracts";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";

const schoolInclude = {
  template: { select: { id: true, name: true, filePath: true } },
  _count: { select: { students: true, printJobs: true } },
} as const;

export async function listSchools() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    include: schoolInclude,
  });
}

export async function createSchool(dto: SchoolDto) {
  const code = dto.code.toUpperCase();
  const existing = await prisma.school.findUnique({ where: { code } });
  if (existing) throw new BadRequestError("School code already exists");

  return prisma.school.create({
    data: {
      name: dto.name,
      code,
      address: dto.address,
      accentColor: dto.accentColor ?? "#CCC3D0",
      academicYear: dto.academicYear,
    },
    include: schoolInclude,
  });
}

export async function getSchool(id: string) {
  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      template: true,
      _count: { select: { students: true, printJobs: true } },
    },
  });
  if (!school) throw new NotFoundError("School not found");
  return school;
}

export async function updateSchool(id: string, dto: SchoolUpdateDto) {
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) throw new NotFoundError("School not found");

  if (dto.code) {
    const code = dto.code.toUpperCase();
    if (code !== school.code) {
      const existing = await prisma.school.findUnique({ where: { code } });
      if (existing) throw new BadRequestError("School code already exists");
    }
  }

  return prisma.school.update({
    where: { id },
    data: {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
      ...(dto.address !== undefined ? { address: dto.address || null } : {}),
      ...(dto.accentColor !== undefined ? { accentColor: dto.accentColor } : {}),
      ...(dto.academicYear !== undefined ? { academicYear: dto.academicYear || null } : {}),
    },
    include: schoolInclude,
  });
}

export async function deleteSchool(id: string) {
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) throw new NotFoundError("School not found");
  await prisma.school.delete({ where: { id } });
  return { ok: true };
}
