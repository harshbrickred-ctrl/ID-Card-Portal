import { prisma } from "@idportal/db";
import type { StudentDto, StudentUpdateDto } from "@idportal/contracts";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";
import * as XLSX from "xlsx";
import { deleteStorageFile, publicFileUrl, readStorageFile, saveFile } from "./storage";

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

const HEADER_MAP: Record<string, keyof StudentDto | "firstName" | "lastName"> = {
  enrollid: "enrollId",
  enrollmentid: "enrollId",
  enrollmentno: "enrollId",
  rollno: "enrollId",
  rollnumber: "enrollId",
  id: "enrollId",
  name: "name",
  studentname: "name",
  firstname: "firstName",
  lastname: "lastName",
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
  phone: "phoneNumber",
  phonenumber: "phoneNumber",
  mobilenumber: "phoneNumber",
  mobile: "phoneNumber",
  contact: "phoneNumber",
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
    const mapped: Partial<StudentDto> & { firstName?: string; lastName?: string } = { schoolId };

    for (const [key, val] of Object.entries(row)) {
      const field = HEADER_MAP[normalizeHeader(key)];
      if (field && val !== "") {
        (mapped as Record<string, string>)[field] = String(val).trim();
      }
    }

    if (!mapped.name && (mapped.firstName || mapped.lastName)) {
      mapped.name = [mapped.firstName, mapped.lastName].filter(Boolean).join(" ");
    }

    if (!mapped.enrollId || !mapped.name || !mapped.class || !mapped.section) {
      skipped.push({
        row: i + 2,
        reason: "Missing required fields (enrollId, name or first+last, class, section)",
      });
      continue;
    }

    try {
      await prisma.student.upsert({
        where: { schoolId_enrollId: { schoolId, enrollId: mapped.enrollId } },
        create: {
          schoolId,
          enrollId: mapped.enrollId,
          name: mapped.name,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          class: mapped.class,
          section: mapped.section,
          fatherName: mapped.fatherName,
          motherName: mapped.motherName,
          dob: mapped.dob,
          phoneNumber: mapped.phoneNumber,
          bloodGroup: mapped.bloodGroup,
          address: mapped.address,
        },
        update: {
          name: mapped.name,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          class: mapped.class,
          section: mapped.section,
          fatherName: mapped.fatherName,
          motherName: mapped.motherName,
          dob: mapped.dob,
          phoneNumber: mapped.phoneNumber,
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
  if (student.photoUrl) {
    await deleteStorageFile(student.photoUrl);
  }
  const stored = await saveFile(relPath, buffer);
  await prisma.student.update({ where: { id: studentId }, data: { photoUrl: stored } });
  return { photoUrl: publicFileUrl(stored) };
}

export async function loadStudentPhotoBuffer(photoUrl: string | null | undefined) {
  if (!photoUrl) return null;
  return readStorageFile(photoUrl);
}

const PHOTO_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

function enrollIdFromPhotoFilename(filename: string): string | null {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const match = base.match(/^(.+)\.(jpg|jpeg|png|webp)$/i);
  if (!match) return null;
  return match[1];
}

export async function importPhotosFromZip(schoolId: string, zipBuffer: Buffer) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const { unzipSync } = await import("fflate");
  const entries = unzipSync(new Uint8Array(zipBuffer));

  const imported: string[] = [];
  const skipped: { file: string; reason: string }[] = [];
  let total = 0;

  for (const [entryPath, data] of Object.entries(entries)) {
    if (entryPath.endsWith("/")) continue;
    total += 1;

    const enrollId = enrollIdFromPhotoFilename(entryPath);
    if (!enrollId) {
      skipped.push({ file: entryPath, reason: "Filename must be {enrollId}.jpg/png" });
      continue;
    }

    const ext = entryPath.split(".").pop()?.toLowerCase() ?? "";
    if (!PHOTO_EXT.has(ext)) {
      skipped.push({ file: entryPath, reason: "Unsupported image type" });
      continue;
    }

    const student = await prisma.student.findUnique({
      where: { schoolId_enrollId: { schoolId, enrollId } },
    });
    if (!student) {
      skipped.push({ file: entryPath, reason: `No student with enrollId ${enrollId}` });
      continue;
    }

    await saveStudentPhoto(student.id, Buffer.from(data), ext === "jpeg" ? "jpg" : ext);
    imported.push(enrollId);
  }

  return { imported: imported.length, skipped, total };
}

export async function listStudentIdsForSchool(schoolId: string, filters?: StudentFilters) {
  return listStudents(filters ?? { schoolId });
}
