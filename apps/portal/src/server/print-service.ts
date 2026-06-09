import { prisma } from "@idportal/db";
import {
  buildStudentPrintZip,
  renderStudentCard,
  renderStudentCardBack,
  validateStudentCard,
} from "@idportal/card-engine";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";
import { loadStudentPhotoBuffer } from "./student-service";
import { loadTemplateBuffer } from "./template-service";

async function buildCardData(student: {
  enrollId: string;
  name: string;
  class: string;
  section: string;
  fatherName: string | null;
  motherName: string | null;
  dob: string | null;
  bloodGroup: string | null;
  address: string | null;
  photoUrl: string | null;
}) {
  const photoBuffer = await loadStudentPhotoBuffer(student.photoUrl);
  return {
    enrollId: student.enrollId,
    name: student.name,
    class: student.class,
    section: student.section,
    fatherName: student.fatherName,
    motherName: student.motherName,
    dob: student.dob,
    bloodGroup: student.bloodGroup,
    address: student.address,
    photoBuffer,
  };
}

export async function previewCards(schoolId: string, studentIds: string[]) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const templateBuffer = await loadTemplateBuffer(schoolId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId },
  });

  if (students.length === 0) throw new BadRequestError("No students found");

  const schoolData = {
    name: school.name,
    code: school.code,
    accentColor: school.accentColor,
  };

  const previews = await Promise.all(
    students.map(async (s) => {
      const cardStudent = await buildCardData(s);
      const errors = validateStudentCard(cardStudent);
      const hasErrors = errors.some((e) =>
        ["Name is required", "Enrollment ID is required", "Class is required", "Section is required"].includes(e),
      );

      const front = await renderStudentCard({
        student: cardStudent,
        school: schoolData,
        templateBuffer,
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
    school: { id: school.id, name: school.name, code: school.code, accentColor: school.accentColor },
    hasTemplate: !!templateBuffer,
    previews,
    canPrint: previews.every((p) => !p.hasErrors),
  };
}

export async function executePrint(schoolId: string, studentIds: string[]) {
  const preview = await previewCards(schoolId, studentIds);
  if (!preview.canPrint) {
    throw new BadRequestError("Fix validation errors before printing");
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const templateBuffer = await loadTemplateBuffer(schoolId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, schoolId },
  });

  const schoolData = {
    name: school.name,
    code: school.code,
    accentColor: school.accentColor,
  };

  const entries = await Promise.all(
    students.map(async (s) => {
      const cardStudent = await buildCardData(s);
      const [front, back] = await Promise.all([
        renderStudentCard({ student: cardStudent, school: schoolData, templateBuffer }),
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
