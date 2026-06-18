import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { writeSampleStudentsExcel } from "./excel-import.mjs";

const CARD_WIDTH = 1011;
const CARD_HEIGHT = 638;

const FIXTURES_DIR = path.resolve("scripts/fixtures");
const TEMPLATE_BASENAME = "sample-template";

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** CR-80 fallback template when scripts/fixtures/sample-template.* is missing. */
async function createFallbackTemplatePng() {
  const accent = "#6366f1";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#f1f5f9"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="100%" height="110" fill="${accent}" opacity="0.12"/>
  <rect x="0" y="0" width="100%" height="8" fill="${accent}"/>
  <text x="48" y="68" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#0f172a">${esc("Demo Public School")}</text>
  <text x="48" y="100" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">STUDENT IDENTITY CARD — SAMPLE TEMPLATE</text>
  <rect x="50" y="150" width="200" height="250" rx="12" fill="#e2e8f0" stroke="${accent}" stroke-width="2" stroke-dasharray="8 6"/>
  <text x="150" y="280" text-anchor="middle" font-family="Arial" font-size="14" fill="#94a3b8">PHOTO</text>
  <text x="280" y="165" font-family="Arial" font-size="12" fill="#cbd5e1">NAME</text>
  <text x="280" y="220" font-family="Arial" font-size="12" fill="#cbd5e1">ENROLL ID</text>
  <text x="280" y="265" font-family="Arial" font-size="12" fill="#cbd5e1">CLASS / SECTION</text>
  <text x="280" y="310" font-family="Arial" font-size="12" fill="#cbd5e1">PHONE</text>
  <text x="280" y="355" font-family="Arial" font-size="12" fill="#cbd5e1">ADDRESS</text>
  <rect x="700" y="520" width="240" height="90" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="6 4"/>
  <text x="820" y="575" text-anchor="middle" font-family="Arial" font-size="12" fill="#94a3b8">SIGNATURE</text>
  <text x="48" y="${CARD_HEIGHT - 36}" font-family="Arial" font-size="13" fill="#94a3b8">Valid for academic year 2025–26</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Prefer scripts/fixtures/sample-template.{png|jpg|jpeg|pdf} or sample-template (no ext). */
export async function resolveTemplatePath() {
  const candidates = [
    path.join(FIXTURES_DIR, TEMPLATE_BASENAME),
    path.join(FIXTURES_DIR, `${TEMPLATE_BASENAME}.png`),
    path.join(FIXTURES_DIR, `${TEMPLATE_BASENAME}.jpg`),
    path.join(FIXTURES_DIR, `${TEMPLATE_BASENAME}.jpeg`),
    path.join(FIXTURES_DIR, `${TEMPLATE_BASENAME}.pdf`),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  return null;
}

export async function ensureFixtures() {
  await mkdir(FIXTURES_DIR, { recursive: true });

  const excelPath = path.join(FIXTURES_DIR, "sample-students.xlsx");
  writeSampleStudentsExcel(excelPath);

  let templatePath = await resolveTemplatePath();
  let templateBuffer;

  if (templatePath) {
    templateBuffer = await readFile(templatePath);
  } else {
    templatePath = path.join(FIXTURES_DIR, `${TEMPLATE_BASENAME}.png`);
    templateBuffer = await createFallbackTemplatePng();
    await writeFile(templatePath, templateBuffer);
  }

  return { excelPath, templatePath, templateBuffer };
}
