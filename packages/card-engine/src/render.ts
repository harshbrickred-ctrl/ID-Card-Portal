import QRCode from "qrcode";
import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import { fitTemplateRaster } from "./raster";
import { DEFAULT_TEMPLATE_LAYOUT, type TemplateFieldKey, type TemplateLayout } from "./layout";
import type { RenderStudentCardInput } from "./types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fieldValue(key: TemplateFieldKey, student: RenderStudentCardInput["student"]): string {
  switch (key) {
    case "name":
      return student.name;
    case "enrollId":
      return student.enrollId;
    case "classSection":
      return `Class ${student.class} - ${student.section}`;
    case "phone":
      return student.phoneNumber?.trim() || "—";
    case "address":
      return student.address?.trim() || "—";
  }
}

function renderFieldSvg(
  field: TemplateLayout["fields"][number],
  student: RenderStudentCardInput["student"],
): string {
  const value = fieldValue(field.key, student);
  const maxChars = field.maxWidth ? Math.floor(field.maxWidth / (field.fontSize * 0.55)) : 60;
  const lines = field.key === "address" ? wrapText(value, maxChars) : [value];
  const lineHeight = field.lineHeight ?? Math.round(field.fontSize * 1.35);
  const weight = field.bold ? "700" : "400";

  return lines
    .map(
      (line, i) =>
        `<text x="${field.x}" y="${field.y + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${field.fontSize}" font-weight="${weight}" fill="#0f172a">${esc(line)}</text>`,
    )
    .join("");
}

async function photoRect(buf: Buffer | null | undefined, w: number, h: number): Promise<Buffer | null> {
  if (!buf) return null;
  return sharp(buf).resize(w, h, { fit: "cover" }).png().toBuffer();
}

async function signatureRect(buf: Buffer | null | undefined, w: number, h: number): Promise<Buffer | null> {
  if (!buf) return null;
  return sharp(buf).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
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

async function prepareTemplateBackground(templateBuffer: Buffer): Promise<Buffer> {
  return fitTemplateRaster(templateBuffer);
}

export function validateStudentCard(student: RenderStudentCardInput["student"]): string[] {
  const errors: string[] = [];
  if (!student.name?.trim()) errors.push("Name is required");
  if (!student.enrollId?.trim()) errors.push("Enrollment ID is required");
  if (!student.class?.trim()) errors.push("Class is required");
  if (!student.section?.trim()) errors.push("Section is required");
  if (!student.photoBuffer) errors.push("Student photo is recommended");
  return errors;
}

export async function renderStudentCard(input: RenderStudentCardInput): Promise<Buffer> {
  const { student, school, templateBuffer, signatureBuffer } = input;
  const layout = input.layout ?? DEFAULT_TEMPLATE_LAYOUT;
  const accent = school.accentColor || "#6366f1";

  const base =
    templateBuffer && templateBuffer.length > 0
      ? await prepareTemplateBackground(templateBuffer)
      : await defaultTemplate(accent, school.name);

  const photo = await photoRect(student.photoBuffer, layout.photo.width, layout.photo.height);
  const signature = await signatureRect(signatureBuffer, layout.signature.width, layout.signature.height);

  const textSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${layout.fields.map((field) => renderFieldSvg(field, student)).join("")}
  <rect x="${layout.photo.x - 4}" y="${layout.photo.y - 4}" width="${layout.photo.width + 8}" height="${layout.photo.height + 8}" rx="12" fill="none" stroke="${accent}" stroke-width="2"/>
</svg>`;

  const composites: sharp.OverlayOptions[] = [{ input: Buffer.from(textSvg), top: 0, left: 0 }];
  if (photo) {
    composites.push({ input: photo, top: layout.photo.y, left: layout.photo.x });
  }
  if (signature) {
    composites.push({ input: signature, top: layout.signature.y, left: layout.signature.x });
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

  const addressLines = student.address?.trim()
    ? wrapText(student.address, 55)
        .map((line, i) => `<text x="48" y="${220 + i * 22}" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#94a3b8">${esc(line)}</text>`)
        .join("")
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="0" y="0" width="100%" height="6" fill="${accent}"/>
  <text x="48" y="80" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#0f172a">${esc(school.name)}</text>
  <text x="48" y="130" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748b">${esc(student.name)}</text>
  <text x="48" y="170" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">Enroll: ${esc(student.enrollId)}</text>
  ${student.phoneNumber ? `<text x="48" y="200" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#94a3b8">Phone: ${esc(student.phoneNumber)}</text>` : ""}
  ${addressLines}
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
