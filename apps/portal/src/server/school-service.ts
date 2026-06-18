import { prisma } from "@idportal/db";
import type { SchoolDto } from "@idportal/contracts";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";

export async function listSchools() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    include: {
      template: { select: { id: true, name: true, filePath: true } },
      _count: { select: { students: true } },
    },
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

export async function deleteSchool(id: string) {
  const school = await prisma.school.findUnique({ where: { id } });
  if (!school) throw new NotFoundError("School not found");
  await prisma.school.delete({ where: { id } });
  return { ok: true };
}
