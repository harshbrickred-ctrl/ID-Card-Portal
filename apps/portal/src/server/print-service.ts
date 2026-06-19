import { prisma } from "@idportal/db";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";
import type { PrintFiltersDto } from "@idportal/contracts";
import {
  buildStudentPrintZip,
  renderStudentCard,
  renderStudentCardBack,
  validateStudentCard,
} from "@idportal/card-engine";
import { loadStudentPhotoBuffer } from "./student-service";
import { loadTemplateAssets } from "./template-service";

const BLOCKING_ERRORS = new Set([
  "Name is required",
  "Enrollment ID is required",
  "Class is required",
  "Section is required",
]);

const MAX_PRINT_BATCH = Number(process.env.MAX_PRINT_BATCH ?? "500");

async function buildCardData(student: {
  enrollId: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  class: string;
  section: string;
  dob: string | null;
  phoneNumber: string | null;
  address: string | null;
  photoUrl: string | null;
}) {
  const photoBuffer = await loadStudentPhotoBuffer(student.photoUrl);
  return {
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
  };
}

export async function resolveStudentIds(
  schoolId: string,
  studentIds?: string[],
  filters?: PrintFiltersDto,
): Promise<string[]> {
  if (studentIds && studentIds.length > 0) {
    const found = await prisma.student.findMany({
      where: { schoolId, id: { in: studentIds } },
      select: { id: true },
    });
    if (found.length === 0) throw new BadRequestError("No students found");
    return found.map((s) => s.id);
  }

  if (!filters) throw new BadRequestError("Provide studentIds or filters");

  const where: Record<string, unknown> = { schoolId };
  if (filters.enrollId) where.enrollId = { contains: filters.enrollId, mode: "insensitive" };
  if (filters.name) where.name = { contains: filters.name, mode: "insensitive" };
  if (filters.class) where.class = filters.class;
  if (filters.section) where.section = filters.section;

  const students = await prisma.student.findMany({ where, select: { id: true } });
  if (students.length === 0) throw new BadRequestError("No students match filters");
  return students.map((s) => s.id);
}

async function loadPrintBatch(schoolId: string, studentIds?: string[], filters?: PrintFiltersDto) {
  const ids = await resolveStudentIds(schoolId, studentIds, filters);
  if (ids.length > MAX_PRINT_BATCH) {
    throw new BadRequestError(`Print batch limit is ${MAX_PRINT_BATCH} cards`);
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const students = await prisma.student.findMany({
    where: { id: { in: ids }, schoolId },
  });

  return { school, students };
}

async function assertPrintableStudents(
  students: Awaited<ReturnType<typeof loadPrintBatch>>["students"],
) {
  const blocking: string[] = [];
  for (const student of students) {
    const cardStudent = await buildCardData(student);
    const errors = validateStudentCard(cardStudent).filter((e) => BLOCKING_ERRORS.has(e));
    if (errors.length > 0) {
      blocking.push(`${student.enrollId}: ${errors.join(", ")}`);
    }
  }
  if (blocking.length > 0) {
    throw new BadRequestError(`Fix validation errors before printing: ${blocking.join("; ")}`);
  }
}

export async function previewCards(
  schoolId: string,
  studentIds?: string[],
  filters?: PrintFiltersDto,
) {
  const { school, students } = await loadPrintBatch(schoolId, studentIds, filters);

  const { templateBuffer, signatureBuffer, hasTemplate, layout } =
    await loadTemplateAssets(schoolId);

  const schoolData = {
    name: school.name,
    code: school.code,
    accentColor: school.accentColor,
    academicYear: school.academicYear,
  };

  const layoutReady = !hasTemplate || Boolean(layout);

  const previews = await Promise.all(
    students.map(async (s) => {
      const cardStudent = await buildCardData(s);
      const errors = validateStudentCard(cardStudent);
      if (!layoutReady) {
        errors.push("Field layout not configured — open Templates → Edit layout");
      }
      const hasErrors = errors.some((e) => BLOCKING_ERRORS.has(e)) || !layoutReady;

      const front = await renderStudentCard({
        student: cardStudent,
        school: schoolData,
        templateBuffer,
        signatureBuffer,
        layout: layout ?? undefined,
      });

      return {
        studentId: s.id,
        enrollId: s.enrollId,
        name: s.name,
        class: s.class,
        section: s.section,
        errors,
        hasErrors,
        previewFront: `data:image/png;base64,${front.toString("base64")}`,
      };
    }),
  );

  return {
    school: {
      id: school.id,
      name: school.name,
      code: school.code,
      accentColor: school.accentColor,
      academicYear: school.academicYear,
    },
    hasTemplate,
    hasLayout: Boolean(layout),
    previews,
    canPrint: previews.every((p) => !p.hasErrors),
  };
}

export async function executePrint(
  schoolId: string,
  studentIds?: string[],
  filters?: PrintFiltersDto,
) {
  const { school, students } = await loadPrintBatch(schoolId, studentIds, filters);
  await assertPrintableStudents(students);

  const { templateBuffer, signatureBuffer, layout, hasTemplate } = await loadTemplateAssets(schoolId);
  if (hasTemplate && !layout) {
    throw new BadRequestError("Configure field layout in Templates → Edit layout before printing.");
  }

  const schoolData = {
    name: school.name,
    code: school.code,
    accentColor: school.accentColor,
    academicYear: school.academicYear,
  };

  const entries = await Promise.all(
    students.map(async (s) => {
      const cardStudent = await buildCardData(s);
      const [front, back] = await Promise.all([
        renderStudentCard({
          student: cardStudent,
          school: schoolData,
          templateBuffer,
          signatureBuffer,
          layout: layout ?? undefined,
        }),
        renderStudentCardBack(cardStudent, schoolData),
      ]);
      return { enrollId: s.enrollId, name: s.name, front, back };
    }),
  );

  const zip = await buildStudentPrintZip(entries);

  const job = await prisma.printJob.create({
    data: {
      schoolId,
      cardCount: entries.length,
      items: { create: students.map((s) => ({ studentId: s.id })) },
    },
  });

  return { jobId: job.id, cardCount: entries.length, zip };
}
