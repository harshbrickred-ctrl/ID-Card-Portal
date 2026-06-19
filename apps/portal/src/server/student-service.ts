import { prisma } from "@idportal/db";
import type { StudentDto, StudentUpdateDto } from "@idportal/contracts";
import { BadRequestError, NotFoundError } from "@idportal/api-kit";
import * as XLSX from "xlsx";
import { deleteStorageFile, publicFileUrl, readStorageFile, saveFile } from "./storage";
import { formatClassSection, parseClassSection } from "@/lib/class-section";

export type ClassSectionSummary = {
  class: string;
  section: string;
  label: string;
  count: number;
  withPhoto: number;
};

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

export async function getClassSectionSummary(schoolId: string): Promise<ClassSectionSummary[]> {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const students = await prisma.student.findMany({
    where: { schoolId },
    select: { class: true, section: true, photoUrl: true },
    orderBy: [{ class: "asc" }, { section: "asc" }],
  });

  const map = new Map<string, ClassSectionSummary>();

  for (const student of students) {
    const key = `${student.class}\0${student.section}`;
    const existing = map.get(key) ?? {
      class: student.class,
      section: student.section,
      label: formatClassSection(student.class, student.section),
      count: 0,
      withPhoto: 0,
    };
    existing.count += 1;
    if (student.photoUrl) existing.withPhoto += 1;
    map.set(key, existing);
  }

  return [...map.values()].sort(
    (a, b) => a.class.localeCompare(b.class, undefined, { numeric: true }) || a.section.localeCompare(b.section),
  );
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
  return h
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const CLASS_SECTION_HEADERS = new Set([
  "classsection",
  "classsec",
  "classandsection",
  "gradewithsection",
  "classsecion",
  "classwithsection",
]);

const HEADER_MAP: Record<string, keyof StudentDto | "firstName" | "lastName"> = {
  enrollid: "enrollId",
  enrollmentid: "enrollId",
  enrollmentno: "enrollId",
  enrollno: "enrollId",
  admissionno: "enrollId",
  admissionnumber: "enrollId",
  admission: "enrollId",
  regno: "enrollId",
  registrationno: "enrollId",
  grno: "enrollId",
  scholarid: "enrollId",
  scholarno: "enrollId",
  rollno: "enrollId",
  rollnumber: "enrollId",
  studentid: "enrollId",
  id: "enrollId",
  name: "name",
  studentname: "name",
  pupilsname: "name",
  fullname: "name",
  firstname: "firstName",
  fname: "firstName",
  lastname: "lastName",
  lname: "lastName",
  surname: "lastName",
  classname: "class",
  class: "class",
  std: "class",
  standard: "class",
  grade: "class",
  section: "section",
  sec: "section",
  division: "section",
  div: "section",
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
  contactno: "phoneNumber",
};

function cellString(val: unknown): string {
  if (val == null || val === "") return "";
  if (typeof val === "number") {
    if (Number.isInteger(val)) return String(val);
    return String(val);
  }
  return String(val).trim();
}

function headerScore(cells: unknown[]): number {
  let score = 0;
  for (const cell of cells) {
    const norm = normalizeHeader(String(cell));
    if (!norm) continue;
    if (HEADER_MAP[norm] || CLASS_SECTION_HEADERS.has(norm)) score += 1;
  }
  return score;
}

function rowsFromSheet(sheet: XLSX.WorkSheet): {
  rows: Record<string, unknown>[];
  headerRowIndex: number;
} {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (matrix.length === 0) return { rows: [], headerRowIndex: 0 };

  let headerRowIndex = 0;
  let bestScore = headerScore(matrix[0] ?? []);
  for (let i = 1; i < Math.min(15, matrix.length); i++) {
    const score = headerScore(matrix[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = i;
    }
  }

  if (bestScore < 2) {
    return {
      rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }),
      headerRowIndex: 0,
    };
  }

  const headers = (matrix[headerRowIndex] ?? []).map((cell) => String(cell).replace(/^\uFEFF/, "").trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const row: Record<string, unknown> = {};
    let hasValue = false;

    headers.forEach((header, col) => {
      if (!header) return;
      const value = line[col] ?? "";
      if (value !== "") hasValue = true;
      row[header] = value;
    });

    if (hasValue) rows.push(row);
  }

  return { rows, headerRowIndex };
}

function mapImportRow(row: Record<string, unknown>, schoolId: string) {
  const mapped: Partial<StudentDto> & { firstName?: string; lastName?: string } = { schoolId };

  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeHeader(key);
    if (CLASS_SECTION_HEADERS.has(norm)) {
      const parsed = parseClassSection(cellString(val));
      if (parsed) {
        mapped.class = parsed.class;
        mapped.section = parsed.section;
      }
      continue;
    }

    const field = HEADER_MAP[norm];
    if (field) {
      const text = cellString(val);
      if (text !== "") {
        (mapped as Record<string, string>)[field] = text;
      }
    }
  }

  if (mapped.class && !mapped.section) {
    const parsed = parseClassSection(mapped.class);
    if (parsed) {
      mapped.class = parsed.class;
      mapped.section = parsed.section;
    }
  }

  if (!mapped.name && (mapped.firstName || mapped.lastName)) {
    mapped.name = [mapped.firstName, mapped.lastName].filter(Boolean).join(" ");
  }

  return mapped;
}

export async function importStudentsFromExcel(schoolId: string, fileBuffer: Buffer) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new NotFoundError("School not found");

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new BadRequestError("Excel file has no sheets");

  const { rows, headerRowIndex } = rowsFromSheet(sheet);
  if (rows.length === 0) throw new BadRequestError("Excel file has no student rows");

  const imported: string[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapImportRow(rows[i], schoolId);
    const excelRow = headerRowIndex + i + 2;

    if (!mapped.enrollId || !mapped.name || !mapped.class || !mapped.section) {
      skipped.push({
        row: excelRow,
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
      skipped.push({ row: excelRow, reason: "Failed to save row" });
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
