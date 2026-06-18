import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

/** Mirrors apps/portal/src/server/student-service.ts HEADER_MAP + row parsing. */

const HEADER_MAP = {
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

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * @param {import("xlsx").WorkBook} workbook
 * @returns {Array<Record<string, string>>}
 */
export function parseStudentsFromWorkbook(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Excel file has no sheets");

  const rows = /** @type {Record<string, unknown>[]} */ (
    XLSX.utils.sheet_to_json(sheet, { defval: "" })
  );

  if (rows.length === 0) throw new Error("Excel file is empty");

  const students = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mapped = {};

    for (const [key, val] of Object.entries(row)) {
      const field = HEADER_MAP[normalizeHeader(key)];
      if (field && val !== "") mapped[field] = String(val).trim();
    }

    if (mapped.firstName || mapped.lastName) {
      const parts = [mapped.firstName, mapped.lastName].filter(Boolean);
      mapped.name = mapped.name || parts.join(" ");
    }

    if (!mapped.enrollId || !mapped.name || !mapped.class || !mapped.section) {
      throw new Error(
        `Row ${i + 2}: missing required fields (enrollId, name, class, section)`,
      );
    }

    students.push(mapped);
  }

  return students;
}

/**
 * @param {string} filePath
 */
export function readStudentsFromExcel(filePath) {
  const workbook = XLSX.read(readFileSync(filePath), { type: "buffer" });
  return parseStudentsFromWorkbook(workbook);
}

/**
 * @param {string} filePath
 */
export function writeSampleStudentsExcel(filePath) {
  const rows = [
    {
      "First Name": "Aarav",
      "Last Name": "Sharma",
      "Enroll ID": "DEMO-2026-001",
      Class: "10",
      Section: "A",
      "Phone Number": "9876543210",
      Address: "12 MG Road, Andheri West, Mumbai 400058",
      DOB: "2010-05-12",
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Students");
  writeFileSync(filePath, XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
