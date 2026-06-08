import QRCode from "qrcode";
import sharp from "sharp";
import type { CardTemplatePreset } from "@idportal/contracts";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import type { CardEmployee, CardOrg } from "./types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function palette(preset: CardTemplatePreset) {
  switch (preset) {
    case "minimal":
      return { bg: "#ffffff", primary: "#1e293b", accent: "#64748b", band: "#f1f5f9" };
    case "photo-left":
      return { bg: "#f8fafc", primary: "#0f172a", accent: "#31879b", band: "#e2e8f0" };
    case "corporate":
    default:
      return { bg: "#ffffff", primary: "#111827", accent: "#d83e65", band: "#fdf2f8" };
  }
}

async function photoCircle(buf: Buffer | null | undefined, size: number): Promise<Buffer | null> {
  if (!buf) return null;
  const rounded = await sharp(buf)
    .resize(size, size, { fit: "cover" })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(rounded).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function logoBox(buf: Buffer | null | undefined, w: number, h: number): Promise<Buffer | null> {
  if (!buf) return null;
  return sharp(buf).resize(w, h, { fit: "inside" }).png().toBuffer();
}

export async function renderCardFront(
  employee: CardEmployee,
  org: CardOrg,
  preset: CardTemplatePreset,
): Promise<Buffer> {
  const colors = palette(preset);
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const photoSize = preset === "photo-left" ? 220 : 180;
  const photo = await photoCircle(employee.photoBuffer, photoSize);
  const logo = await logoBox(org.logoBuffer, 120, 48);

  const photoX = preset === "photo-left" ? 48 : CARD_WIDTH / 2 - photoSize / 2;
  const photoY = preset === "photo-left" ? 120 : 72;
  const textX = preset === "photo-left" ? 300 : CARD_WIDTH / 2;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${colors.bg}"/>
  <rect x="0" y="0" width="100%" height="88" fill="${colors.band}"/>
  <text x="48" y="58" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="${colors.primary}">${esc(org.name)}</text>
  <text x="${textX}" y="${preset === "photo-left" ? 180 : 320}" text-anchor="${preset === "photo-left" ? "start" : "middle"}" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="${colors.primary}">${esc(fullName)}</text>
  <text x="${textX}" y="${preset === "photo-left" ? 230 : 370}" text-anchor="${preset === "photo-left" ? "start" : "middle"}" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="${colors.accent}">${esc(employee.employeeCode)}</text>
  ${employee.department ? `<text x="${textX}" y="${preset === "photo-left" ? 275 : 415}" text-anchor="${preset === "photo-left" ? "start" : "middle"}" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="${colors.primary}">${esc(employee.department)}</text>` : ""}
  ${employee.designation ? `<text x="${textX}" y="${preset === "photo-left" ? 315 : 450}" text-anchor="${preset === "photo-left" ? "start" : "middle"}" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748b">${esc(employee.designation)}</text>` : ""}
</svg>`;

  const composites: sharp.OverlayOptions[] = [];
  if (logo) {
    composites.push({ input: logo, top: 20, left: CARD_WIDTH - 168 });
  }
  if (photo) {
    composites.push({ input: photo, top: photoY, left: photoX });
  }

  return sharp(Buffer.from(svg)).composite(composites).png().toBuffer();
}

export async function renderCardBack(
  employee: CardEmployee,
  org: CardOrg,
  preset: CardTemplatePreset,
): Promise<Buffer> {
  const colors = palette(preset);
  const qrPng = await QRCode.toBuffer(employee.employeeCode, {
    type: "png",
    width: 200,
    margin: 1,
    color: { dark: colors.primary, light: colors.bg },
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${colors.bg}"/>
  <text x="48" y="80" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${colors.primary}">${esc(org.name)}</text>
  <text x="48" y="130" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748b">Employee ID: ${esc(employee.employeeCode)}</text>
  ${employee.dateOfJoining ? `<text x="48" y="170" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#64748b">Joined: ${esc(employee.dateOfJoining)}</text>` : ""}
  <text x="48" y="${CARD_HEIGHT - 48}" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#94a3b8">Property of ${esc(org.name)}. If found, please return.</text>
</svg>`;

  return sharp(Buffer.from(svg))
    .composite([{ input: qrPng, top: 200, left: CARD_WIDTH - 248 }])
    .png()
    .toBuffer();
}

export async function renderEmployeeCards(
  employee: CardEmployee,
  org: CardOrg,
  preset: CardTemplatePreset,
): Promise<{ front: Buffer; back: Buffer }> {
  const [front, back] = await Promise.all([
    renderCardFront(employee, org, preset),
    renderCardBack(employee, org, preset),
  ]);
  return { front, back };
}
