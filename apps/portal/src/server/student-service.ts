import { prisma } from "@idportal/db";
import type { StudentDto, StudentUpdateDto } from "@idportal/contracts";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";
import * as XLSX from "xlsx";
import { publicFileUrl, readStorageFile, saveFile } from "./storage";

export type StudentFilters = {
  schoolId: string;
  enrollId?: string;
  name?: string;
  class?: string;
  section?: string;
};

export async function listStudents(filters: StudentFilters) {
  const where: Record<string, unknown> = { schoolId: filters.schoolId };
  if (filters.enrollId) where.enrollId = { contains: filters.enrollId, mode: "insensitive" };
  if (filters.name) where.name = { contains: filters.name, mode: "insensitive" };
  if (filters.class) where.class = filters.class;
  if (filters.section) where.section = filters.section;

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ class: "asc" }, { section: "asc" }, { name: "asc" }],
  });

  return students.map((s) => ({
    ...s,
    photoUrl: s.photoUrl ? publicFileUrl(s.photoUrl) : null,
  }));
}

export async function createStudent(dto: StudentDto) {
  const existing = await prisma.student.findUnique({
    where: { schoolId_enrollId: { schoolId: dto.schoolId, enrollId: dto.enrollId } },
  });
  if (existing) throw new BadRequestError("Enrollment ID already exists for this school");

  const student = await prisma.student.create({ data: dto });
  return { ...student, photoUrl: student.photoUrl ? publicFileUrl(student.photoUrl) : null };
}

export async function updateStudent(id: string, dto: StudentUpdateDto) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundError("Student not found");

  if (dto.enrollId && dto.enrollId !== student.enrollId) {
    const clash = await prisma.student.findUnique({
      where: { schoolId_enrollId: { schoolId: student.schoolId, enrollId: dto.enrollId } },
    });
    if (clash) throw new BadRequestError("Enrollment ID already exists");
  }

  const updated = await prisma.student.update({ where: { id }, data: dto });
  return { ...updated, photoUrl: updated.photoUrl ? publicFileUrl(updated.photoUrl) : null };
}

export async function deleteStudent(id: string) {
  await prisma.student.delete({ where: { id } });
  return { ok: true };
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_MAP: Record<string, keyof StudentDto> = {
  enrollid: "enrollId",
  enrollmentid: "enrollId",
  enrollmentno: "enrollId",
  rollno: "enrollId",
  rollnumber: "enrollId",
  id: "enrollId",
  name: "name",
  studentname: "name",
  classname: "class",
  class: "class",
  std: "class",
  section: "section",
  sec: "section",
  fathername: "fatherName",
  father: "fatherName",
  mothername: "motherName",
  mother: "motherName",
  dob: "dob",
  dateofbirth: "dob",
  birthdate: "dob",
  bloodgroup: "bloodGroup",
  blood: "bloodGroup",
  address: "address",
};

export async function importStudentsFromExcel(schoolId: string, fileBuffer: Buffer) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new BadRequestError("Excel file has no sheets");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) throw new BadRequestError("Excel file is empty");

  const imported: string[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mapped: Partial<StudentDto> = { schoolId };

    for (const [key, val] of Object.entries(row)) {
      const field = HEADER_MAP[normalizeHeader(key)];
      if (field && val !== "") {
        (mapped as Record<string, string>)[field] = String(val).trim();
      }
    }

    if (!mapped.enrollId || !mapped.name || !mapped.class || !mapped.section) {
      skipped.push({ row: i + 2, reason: "Missing required fields (enrollId, name, class, section)" });
      continue;
    }

    try {
      await prisma.student.upsert({
        where: { schoolId_enrollId: { schoolId, enrollId: mapped.enrollId } },
        create: mapped as StudentDto,
        update: {
          name: mapped.name,
          class: mapped.class,
          section: mapped.section,
          fatherName: mapped.fatherName,
          motherName: mapped.motherName,
          dob: mapped.dob,
          bloodGroup: mapped.bloodGroup,
          address: mapped.address,
        },
      });
      imported.push(mapped.enrollId);
    } catch {
      skipped.push({ row: i + 2, reason: "Failed to save row" });
    }
  }

  return { imported: imported.length, skipped, total: rows.length };
}

export async function saveStudentPhoto(studentId: string, buffer: Buffer, ext: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student not found");

  const relPath = `photos/${student.schoolId}/${student.enrollId}.${ext}`;
  await saveFile(relPath, buffer);
  await prisma.student.update({ where: { id: studentId }, data: { photoUrl: relPath } });
  return { photoUrl: publicFileUrl(relPath) };
}

export async function loadStudentPhotoBuffer(photoUrl: string | null | undefined) {
  if (!photoUrl) return null;
  const rel = photoUrl.startsWith("/api/files/") ? photoUrl.replace("/api/files/", "") : photoUrl;
  return readStorageFile(rel);
}
