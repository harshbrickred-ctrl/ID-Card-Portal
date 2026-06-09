import QRCode from "qrcode";
import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import type { RenderStudentCardInput } from "./types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function photoRect(buf: Buffer | null | undefined, w: number, h: number): Promise<Buffer | null> {
  if (!buf) return null;
  return sharp(buf).resize(w, h, { fit: "cover" }).png().toBuffer();
}

async function defaultTemplate(accent: string, schoolName: string): Promise<Buffer> {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#f8fafc"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="100%" height="110" fill="${accent}" opacity="0.15"/>
  <rect x="0" y="0" width="100%" height="6" fill="${accent}"/>
  <text x="48" y="72" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0f172a">${esc(schoolName)}</text>
  <text x="48" y="104" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">STUDENT IDENTITY CARD</text>
  <rect x="40" y="140" width="220" height="270" rx="12" fill="#f1f5f9" stroke="${accent}" stroke-width="2"/>
  <text x="48" y="${CARD_HEIGHT - 40}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#94a3b8">Valid for current academic year</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function validateStudentCard(student: RenderStudentCardInput["student"]): string[] {
  const errors: string[] = [];
  if (!student.name?.trim()) errors.push("Name is required");
  if (!student.enrollId?.trim()) errors.push("Enrollment ID is required");
  if (!student.class?.trim()) errors.push("Class is required");
  if (!student.section?.trim()) errors.push("Section is required");
  if (!student.fatherName?.trim()) errors.push("Father's name is recommended");
  if (!student.dob?.trim()) errors.push("Date of birth is recommended");
  return errors;
}

export async function renderStudentCard(input: RenderStudentCardInput): Promise<Buffer> {
  const { student, school, templateBuffer } = input;
  const accent = school.accentColor || "#6366f1";

  const base =
    templateBuffer && templateBuffer.length > 0
      ? await sharp(templateBuffer).resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" }).png().toBuffer()
      : await defaultTemplate(accent, school.name);

  const photo = await photoRect(student.photoBuffer, 200, 250);
  const textX = 280;
  const lines = [
    { label: "Name", value: student.name, y: 180, size: 36, bold: true },
    { label: "Enroll ID", value: student.enrollId, y: 240, size: 24, bold: false },
    { label: "Class / Section", value: `Class ${student.class} - ${student.section}`, y: 290, size: 22, bold: false },
    { label: "Father", value: student.fatherName ?? "—", y: 340, size: 20, bold: false },
    { label: "DOB", value: student.dob ?? "—", y: 385, size: 20, bold: false },
    { label: "Blood Group", value: student.bloodGroup ?? "—", y: 430, size: 20, bold: false },
  ];

  const textSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${lines
    .map(
      (l) => `
  <text x="${textX}" y="${l.y}" font-family="Arial, Helvetica, sans-serif" font-size="${l.size}" font-weight="${l.bold ? "700" : "400"}" fill="#0f172a">${esc(l.value)}</text>`,
    )
    .join("")}
  <rect x="36" y="136" width="228" height="278" rx="12" fill="none" stroke="${accent}" stroke-width="2"/>
</svg>`;

  const composites: sharp.OverlayOptions[] = [{ input: Buffer.from(textSvg), top: 0, left: 0 }];
  if (photo) {
    composites.push({ input: photo, top: 150, left: 50 });
  }

  return sharp(base).composite(composites).png().toBuffer();
}

export async function renderStudentCardBack(
  student: RenderStudentCardInput["student"],
  school: RenderStudentCardInput["school"],
): Promise<Buffer> {
  const accent = school.accentColor || "#6366f1";
  const qrPng = await QRCode.toBuffer(student.enrollId, {
    type: "png",
    width: 180,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="0" y="0" width="100%" height="6" fill="${accent}"/>
  <text x="48" y="80" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#0f172a">${esc(school.name)}</text>
  <text x="48" y="130" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748b">${esc(student.name)}</text>
  <text x="48" y="170" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">Enroll: ${esc(student.enrollId)}</text>
  ${student.address ? `<text x="48" y="220" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#94a3b8">${esc(student.address)}</text>` : ""}
  <text x="48" y="${CARD_HEIGHT - 48}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#94a3b8">If found, please return to ${esc(school.name)}</text>
</svg>`;

  return sharp(Buffer.from(svg))
    .composite([{ input: qrPng, top: 240, left: CARD_WIDTH - 230 }])
    .png()
    .toBuffer();
}

export async function buildStudentPrintZip(
  entries: { enrollId: string; name: string; front: Buffer; back: Buffer }[],
): Promise<Buffer> {
  const archiver = (await import("archiver")).default;
  const { PassThrough } = await import("stream");
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  stream.on("data", (c: Buffer) => chunks.push(c));

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(stream);

  for (const e of entries) {
    const safe = e.enrollId.replace(/[^a-zA-Z0-9_-]/g, "_");
    archive.append(e.front, { name: `${safe}_front.png` });
    archive.append(e.back, { name: `${safe}_back.png` });
  }

  const manifest = ["enrollId,name", ...entries.map((e) => `${e.enrollId},"${e.name.replace(/"/g, '""')}"`)].join("\n");
  archive.append(manifest, { name: "manifest.csv" });

  await archive.finalize();
  await new Promise<void>((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  return Buffer.concat(chunks);
}
