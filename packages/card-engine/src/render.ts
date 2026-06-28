import QRCode from "qrcode";
import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import { resolveCardDimensions, scaleFromCr80, type CardDimensions } from "./dimensions";
import {
  DEFAULT_TEMPLATE_LAYOUT,
  DEFAULT_FIELD_LABELS,
  scaleTemplateLayout,
  type TemplateFieldKey,
  type TemplateLayout,
  type TemplatePhotoShape,
} from "./layout";
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

function fieldValue(
  key: TemplateFieldKey,
  student: RenderStudentCardInput["student"],
  school: RenderStudentCardInput["school"],
  options?: { labeled?: boolean },
): string {
  const labeled = options?.labeled ?? false;
  switch (key) {
    case "name":
      return student.name;
    case "firstName":
      return student.firstName?.trim() || student.name.split(/\s+/)[0] || student.name;
    case "lastName": {
      const parts = student.lastName?.trim()
        ? [student.lastName.trim()]
        : student.name.trim().split(/\s+/).slice(1);
      return parts.join(" ") || "—";
    }
    case "enrollId":
      return student.enrollId;
    case "classSection":
      return `${student.class} - ${student.section}`;
    case "dob":
      return student.dob?.trim() || "—";
    case "phone":
      return student.phoneNumber?.trim() || "—";
    case "address":
      return student.address?.trim() || "—";
    case "academicYear":
      return school.academicYear?.trim() || "—";
  }
}

function textEl(
  x: number,
  y: number,
  text: string,
  opts: {
    fontSize: number;
    bold?: boolean;
    fill?: string;
    anchor?: string;
    baseline?: string;
    middleOffset?: number;
    lineIndex?: number;
    lineHeight?: number;
  },
): string {
  const weight = opts.bold ? "700" : "400";
  const fill = opts.fill ?? "#0f172a";
  const anchor = opts.anchor ?? "start";
  const baseline = opts.baseline ?? "auto";
  const lineHeight = opts.lineHeight ?? Math.round(opts.fontSize * 1.35);
  const lineIndex = opts.lineIndex ?? 0;
  const yPos = y + (opts.middleOffset ?? 0) + lineIndex * lineHeight;
  return `<text x="${x}" y="${yPos}" font-family="Arial, Helvetica, sans-serif" font-size="${opts.fontSize}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="${baseline === "middle" ? "middle" : "auto"}">${esc(text)}</text>`;
}

function renderFieldSvg(
  field: TemplateLayout["fields"][number],
  student: RenderStudentCardInput["student"],
  school: RenderStudentCardInput["school"],
): string {
  const labeled = Boolean(field.showLabel);
  const value = fieldValue(field.key, student, school, { labeled });
  const maxChars = field.maxWidth ? Math.floor(field.maxWidth / (field.fontSize * 0.55)) : 60;
  const lines = field.key === "address" ? wrapText(value, maxChars) : [value];
  const lineHeight = field.lineHeight ?? Math.round(field.fontSize * 1.35);
  const anchor = field.textAnchor ?? "start";
  const baseline = field.dominantBaseline ?? "auto";
  const middleOffset =
    baseline === "middle" && lines.length > 1
      ? -Math.round(((lines.length - 1) * lineHeight) / 2)
      : 0;

  const parts: string[] = [];

  if (labeled) {
    const labelText = `${field.label ?? DEFAULT_FIELD_LABELS[field.key]} :`;
    const labelX = field.labelX ?? field.x;
    const labelY = field.labelY ?? field.y;
    const labelSize = field.labelFontSize ?? field.fontSize;
    parts.push(
      textEl(labelX, labelY, labelText, {
        fontSize: labelSize,
        bold: true,
        fill: field.labelFill ?? field.fill ?? "#334155",
        anchor,
        baseline,
        middleOffset,
      }),
    );
  }

  for (const [i, line] of lines.entries()) {
    parts.push(
      textEl(field.x, field.y, line, {
        fontSize: field.fontSize,
        bold: field.bold,
        fill: field.fill,
        anchor,
        baseline,
        middleOffset,
        lineIndex: i,
        lineHeight,
      }),
    );
  }

  return parts.join("");
}

async function photoRect(
  buf: Buffer | null | undefined,
  w: number,
  h: number,
  shape: TemplatePhotoShape = "rectangle",
): Promise<Buffer | null> {
  if (!buf) return null;
  const resized = await sharp(buf).resize(w, h, { fit: "cover" }).png().toBuffer();
  if (shape === "rectangle") return resized;

  const radiusX = shape === "circle" ? Math.min(w, h) / 2 : w / 2;
  const radiusY = shape === "circle" ? Math.min(w, h) / 2 : h / 2;
  const cx = w / 2;
  const cy = h / 2;
  const maskSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${cx}" cy="${cy}" rx="${radiusX}" ry="${radiusY}" fill="white"/>
</svg>`;

  return sharp(resized)
    .composite([{ input: Buffer.from(maskSvg), blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function signatureRect(buf: Buffer | null | undefined, w: number, h: number): Promise<Buffer | null> {
  if (!buf) return null;
  return sharp(buf).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

function photoFrameSvg(layout: TemplateLayout, accent: string): string {
  if (layout.photoBorder !== true) return "";

  const { x, y, width, height } = layout.photo;
  const shape = layout.photoShape ?? "rectangle";
  if (shape === "circle" || shape === "ellipse") {
    const rx = shape === "circle" ? Math.min(width, height) / 2 : width / 2;
    const ry = shape === "circle" ? Math.min(width, height) / 2 : height / 2;
    return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${accent}" stroke-width="2"/>`;
  }

  return `<rect x="${x - 4}" y="${y - 4}" width="${width + 8}" height="${height + 8}" rx="12" fill="none" stroke="${accent}" stroke-width="2"/>`;
}

async function defaultTemplate(accent: string, schoolName: string, dims: CardDimensions): Promise<Buffer> {
  const { width, height } = dims;
  const { sx, sy, fontScale } = scaleFromCr80(width, height);
  const padX = Math.round(48 * sx);
  const headerH = Math.round(110 * sy);
  const accentH = Math.max(4, Math.round(6 * sy));
  const photoX = Math.round(40 * sx);
  const photoY = Math.round(140 * sy);
  const photoW = Math.round(220 * sx);
  const photoH = Math.round(270 * sy);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#f8fafc"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="100%" height="${headerH}" fill="${accent}" opacity="0.15"/>
  <rect x="0" y="0" width="100%" height="${accentH}" fill="${accent}"/>
  <text x="${padX}" y="${Math.round(72 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(30 * fontScale)}" font-weight="700" fill="#0f172a">${esc(schoolName)}</text>
  <text x="${padX}" y="${Math.round(104 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(18 * fontScale)}" fill="#64748b">STUDENT IDENTITY CARD</text>
  <rect x="${photoX}" y="${photoY}" width="${photoW}" height="${photoH}" rx="12" fill="#f1f5f9" stroke="${accent}" stroke-width="2"/>
  <text x="${padX}" y="${height - Math.round(40 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(14 * fontScale)}" fill="#94a3b8">Valid for current academic year</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function prepareTemplateBackground(templateBuffer: Buffer): Promise<Buffer> {
  return sharp(templateBuffer).png().toBuffer();
}

/** Map saved layout coords onto the actual template raster pixel grid. */
function alignLayoutToImage(layout: TemplateLayout, imageWidth: number, imageHeight: number): TemplateLayout {
  const fromW = layout.sourceWidth ?? CARD_WIDTH;
  const fromH = layout.sourceHeight ?? CARD_HEIGHT;
  const scaled = scaleTemplateLayout(
    { ...layout, sourceWidth: fromW, sourceHeight: fromH },
    imageWidth,
    imageHeight,
  );
  return { ...scaled, sourceWidth: imageWidth, sourceHeight: imageHeight };
}

export function validateStudentCard(student: RenderStudentCardInput["student"]): string[] {
  const errors: string[] = [];
  if (!student.name?.trim()) errors.push("Name is required");
  if (!student.enrollId?.trim()) errors.push("Enrollment ID is required");
  if (!student.class?.trim()) errors.push("Class is required");
  if (!student.section?.trim()) errors.push("Section is required");
  if (!student.photoBuffer) errors.push("Student photo is required");
  return errors;
}

export async function renderStudentCard(input: RenderStudentCardInput): Promise<Buffer> {
  const { student, school, templateBuffer, signatureBuffer } = input;
  const hasCustomTemplate = Boolean(templateBuffer && templateBuffer.length > 0);

  if (hasCustomTemplate && input.layout == null) {
    return prepareTemplateBackground(templateBuffer!);
  }

  const layout = input.layout ?? DEFAULT_TEMPLATE_LAYOUT;
  const accent = school.accentColor || "#6366f1";

  const base =
    templateBuffer && templateBuffer.length > 0
      ? await prepareTemplateBackground(templateBuffer)
      : await defaultTemplate(
          accent,
          school.name,
          await resolveCardDimensions(layout, templateBuffer),
        );

  const baseMeta = await sharp(base).metadata();
  const canvasW = baseMeta.width ?? CARD_WIDTH;
  const canvasH = baseMeta.height ?? CARD_HEIGHT;
  const renderLayout = alignLayoutToImage(layout, canvasW, canvasH);

  const photo = await photoRect(
    student.photoBuffer,
    renderLayout.photo.width,
    renderLayout.photo.height,
    renderLayout.photoShape ?? "rectangle",
  );
  const signature = await signatureRect(
    signatureBuffer,
    renderLayout.signature.width,
    renderLayout.signature.height,
  );

  const textSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasW}" height="${canvasH}" xmlns="http://www.w3.org/2000/svg">
  ${renderLayout.fields.map((field) => renderFieldSvg(field, student, school)).join("")}
  ${photoFrameSvg(renderLayout, accent)}
</svg>`;

  const composites: sharp.OverlayOptions[] = [];
  if (photo) {
    composites.push({ input: photo, top: renderLayout.photo.y, left: renderLayout.photo.x });
  }
  if (signature) {
    composites.push({
      input: signature,
      top: renderLayout.signature.y,
      left: renderLayout.signature.x,
    });
  }
  composites.push({ input: Buffer.from(textSvg), top: 0, left: 0 });

  return sharp(base).composite(composites).png().toBuffer();
}

export async function renderStudentCardBack(
  student: RenderStudentCardInput["student"],
  school: RenderStudentCardInput["school"],
  dimensions?: CardDimensions,
): Promise<Buffer> {
  const accent = school.accentColor || "#6366f1";
  const width = dimensions?.width ?? CARD_WIDTH;
  const height = dimensions?.height ?? CARD_HEIGHT;
  const { sx, sy, fontScale } = scaleFromCr80(width, height);
  const padX = Math.round(48 * sx);
  const accentH = Math.max(4, Math.round(6 * sy));
  const qrSize = Math.round(180 * fontScale);

  const qrPng = await QRCode.toBuffer(student.enrollId, {
    type: "png",
    width: qrSize,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const addressMaxChars = Math.max(20, Math.floor(55 * sx));
  const addressLines = student.address?.trim()
    ? wrapText(student.address, addressMaxChars)
        .map(
          (line, i) =>
            `<text x="${padX}" y="${Math.round(220 * sy) + i * Math.round(22 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(16 * fontScale)}" fill="#94a3b8">${esc(line)}</text>`,
        )
        .join("")
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="0" y="0" width="100%" height="${accentH}" fill="${accent}"/>
  <text x="${padX}" y="${Math.round(80 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(28 * fontScale)}" font-weight="700" fill="#0f172a">${esc(school.name)}</text>
  <text x="${padX}" y="${Math.round(130 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(20 * fontScale)}" fill="#64748b">${esc(student.name)}</text>
  <text x="${padX}" y="${Math.round(170 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(18 * fontScale)}" fill="#64748b">Enroll: ${esc(student.enrollId)}</text>
  ${student.phoneNumber ? `<text x="${padX}" y="${Math.round(200 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(16 * fontScale)}" fill="#94a3b8">Phone: ${esc(student.phoneNumber)}</text>` : ""}
  ${addressLines}
  <text x="${padX}" y="${height - Math.round(48 * sy)}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(14 * fontScale)}" fill="#94a3b8">If found, please return to ${esc(school.name)}</text>
</svg>`;

  return sharp(Buffer.from(svg))
    .composite([{ input: qrPng, top: Math.round(240 * sy), left: width - Math.round(230 * sx) }])
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

  const zipReady = new Promise<void>((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => stream.destroy(err));
  archive.pipe(stream);

  for (const e of entries) {
    const safe = e.enrollId.replace(/[^a-zA-Z0-9_-]/g, "_");
    archive.append(e.front, { name: `${safe}_front.png` });
    archive.append(e.back, { name: `${safe}_back.png` });
  }

  const manifest = ["enrollId,name", ...entries.map((e) => `${e.enrollId},"${e.name.replace(/"/g, '""')}"`)].join("\n");
  archive.append(manifest, { name: "manifest.csv" });

  await archive.finalize();
  await zipReady;

  return Buffer.concat(chunks);
}

const PDF_COLS = 2;
const PDF_ROWS = 5;
const PDF_PER_PAGE = PDF_COLS * PDF_ROWS;
const MM_TO_PT = 72 / 25.4;
const PDF_CARD_W = 85.6 * MM_TO_PT;
const PDF_CARD_H = 53.98 * MM_TO_PT;
const PDF_GAP = 10;
const PDF_PAGE_W = 595.28;
const PDF_PAGE_H = 841.89;

async function addCardGridToPdf(
  pdfDoc: Awaited<ReturnType<Awaited<typeof import("pdf-lib")>["PDFDocument"]["create"]>>,
  rgb: (typeof import("pdf-lib"))["rgb"],
  title: string,
  sideLabel: string,
  buffers: Buffer[],
) {
  const gridW = PDF_COLS * PDF_CARD_W + (PDF_COLS - 1) * PDF_GAP;
  const gridH = PDF_ROWS * PDF_CARD_H + (PDF_ROWS - 1) * PDF_GAP;
  const originX = (PDF_PAGE_W - gridW) / 2;
  const topY = (PDF_PAGE_H + gridH) / 2;

  for (let pageStart = 0; pageStart < buffers.length; pageStart += PDF_PER_PAGE) {
    const page = pdfDoc.addPage([PDF_PAGE_W, PDF_PAGE_H]);
    const batch = buffers.slice(pageStart, pageStart + PDF_PER_PAGE);
    const pageNum = Math.floor(pageStart / PDF_PER_PAGE) + 1;
    const totalPages = Math.ceil(buffers.length / PDF_PER_PAGE);

    page.drawText(`${title} — ${sideLabel} (page ${pageNum}/${totalPages})`, {
      x: 36,
      y: PDF_PAGE_H - 28,
      size: 9,
      color: rgb(0.45, 0.45, 0.5),
    });

    for (let i = 0; i < batch.length; i++) {
      const col = i % PDF_COLS;
      const row = Math.floor(i / PDF_COLS);
      const x = originX + col * (PDF_CARD_W + PDF_GAP);
      const y = topY - row * (PDF_CARD_H + PDF_GAP) - PDF_CARD_H;
      const png = await pdfDoc.embedPng(batch[i]);
      page.drawImage(png, { x, y, width: PDF_CARD_W, height: PDF_CARD_H });
      page.drawRectangle({
        x,
        y,
        width: PDF_CARD_W,
        height: PDF_CARD_H,
        borderColor: rgb(0.82, 0.82, 0.85),
        borderWidth: 0.5,
      });
    }
  }
}

/** A4 print sheets: front pages first, then back pages (2×5 CR-80 grid per page). */
export async function buildStudentPrintPdf(
  entries: { enrollId: string; name: string; front: Buffer; back: Buffer }[],
): Promise<Buffer> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Student ID Cards");
  pdfDoc.setCreator("School ID Card Portal");

  await addCardGridToPdf(
    pdfDoc,
    rgb,
    "Student ID Cards",
    "Front",
    entries.map((e) => e.front),
  );
  await addCardGridToPdf(
    pdfDoc,
    rgb,
    "Student ID Cards",
    "Back",
    entries.map((e) => e.back),
  );

  return Buffer.from(await pdfDoc.save());
}
