/**
 * End-to-end verification (no database, no photos):
 *   sample Excel → parse row → sample template → render 1 ID card → verify PNG output
 *
 * Usage: npm run verify:card
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  buildStudentPrintZip,
  CARD_HEIGHT,
  CARD_WIDTH,
  renderStudentCard,
  renderStudentCardBack,
  validateStudentCard,
} from "../packages/card-engine/src/index.ts";
import { readStudentsFromExcel } from "./lib/excel-import.mjs";
import { ensureFixtures } from "./lib/generate-fixtures.mjs";
import { loadTemplateLayout } from "./lib/load-layout.mjs";

const OUTPUT_DIR = path.resolve("scripts/output");

function log(step, detail) {
  console.log(`✓ ${step}${detail ? `: ${detail}` : ""}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function assertPngDimensions(filePath, label) {
  const meta = await sharp(filePath).metadata();
  if (meta.width !== CARD_WIDTH || meta.height !== CARD_HEIGHT) {
    fail(`${label} dimensions ${meta.width}×${meta.height}, expected ${CARD_WIDTH}×${CARD_HEIGHT}`);
  }
}

async function main() {
  console.log("ID Card Portal — single-card flow verification\n");

  // 1. Fixtures
  const { excelPath, templatePath } = await ensureFixtures();
  log("Fixtures ready", excelPath);
  log("Template ready", templatePath);

  // 2. Excel import (first row only)
  const students = readStudentsFromExcel(excelPath);
  if (students.length === 0) fail("No students parsed from Excel");
  const row = students[0];
  log(
    "Excel parsed",
    `${row.name} (${row.enrollId}) · Class ${row.class}-${row.section}`,
  );

  const student = {
    enrollId: row.enrollId,
    name: row.name,
    class: row.class,
    section: row.section,
    dob: row.dob ?? null,
    phoneNumber: row.phoneNumber ?? null,
    address: row.address ?? null,
    photoBuffer: null,
  };

  const school = {
    name: "Demo Public School",
    code: "DEMO",
    accentColor: "#6366f1",
    academicYear: "2025-26",
  };

  // 3. Validate (photo optional — warning only)
  const errors = validateStudentCard(student);
  const blocking = errors.filter((e) => !e.includes("photo"));
  if (blocking.length > 0) {
    fail(`Validation failed: ${blocking.join("; ")}`);
  }
  if (errors.length > 0) {
    log("Validation warnings", errors.join(", "));
  } else {
    log("Validation", "pass");
  }

  // 4. Render front + back (no images)
  const templateOnDisk = await readFile(templatePath);
  const layout = await loadTemplateLayout(templatePath);
  if (layout) {
    log("Layout loaded", "sample-template.layout.json");
  } else {
    log("Layout", "using default field positions (may misalign custom templates)");
  }

  const [front, back] = await Promise.all([
    renderStudentCard({
      student,
      school,
      templateBuffer: templateOnDisk,
      signatureBuffer: null,
      layout: layout ?? undefined,
    }),
    renderStudentCardBack(student, school),
  ]);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const safeId = row.enrollId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const frontPath = path.join(OUTPUT_DIR, `${safeId}_front.png`);
  const backPath = path.join(OUTPUT_DIR, `${safeId}_back.png`);
  const zipPath = path.join(OUTPUT_DIR, "demo-batch.zip");

  await writeFile(frontPath, front);
  await writeFile(backPath, back);
  log("Rendered front", `${frontPath} (${CARD_WIDTH}×${CARD_HEIGHT})`);
  log("Rendered back", backPath);

  await assertPngDimensions(frontPath, "Front card");
  await assertPngDimensions(backPath, "Back card");

  if (front.length < 5000) fail("Front PNG suspiciously small — render may have failed");
  if (back.length < 5000) fail("Back PNG suspiciously small — render may have failed");

  // 5. ZIP export (same as Print → Download)
  const zip = await buildStudentPrintZip([
    { enrollId: row.enrollId, name: row.name, front, back },
  ]);
  await writeFile(zipPath, zip);
  log("ZIP export", `${zipPath} (${zip.length} bytes)`);

  if (zip.length < 1000) fail("ZIP suspiciously small");

  console.log("\nAll checks passed — open scripts/output/ to inspect the card PNGs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
