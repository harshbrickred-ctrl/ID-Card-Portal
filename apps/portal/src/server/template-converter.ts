import { BadRequestError } from "@idportal/api-kit";
import { CARD_HEIGHT, CARD_WIDTH } from "@idportal/card-engine";
import sharp from "sharp";
import { convertCdrToPng } from "./cdr-converter";
import type { TemplateSourceFormat } from "./template-utils";
import { isRasterTemplateFormat } from "./template-utils";

async function normalizeRaster(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "contain", background: "#ffffff" })
    .png()
    .toBuffer();
}

async function rasterizePdf(buffer: Buffer): Promise<Buffer> {
  const { pdfToPng } = await import("pdf-to-png-converter");
  const pages = await pdfToPng(buffer, {
    disableFontFace: true,
    useSystemFonts: true,
    viewportScale: 2,
  });
  const first = pages[0];
  if (!first?.content) {
    throw new BadRequestError("PDF template has no pages to render");
  }
  return normalizeRaster(Buffer.from(first.content));
}

export async function rasterizeTemplate(
  buffer: Buffer,
  format: TemplateSourceFormat,
  preview?: { buffer: Buffer; format: TemplateSourceFormat } | null,
): Promise<Buffer> {
  if (isRasterTemplateFormat(format)) {
    return normalizeRaster(buffer);
  }

  if (format === "pdf") {
    return rasterizePdf(buffer);
  }

  if (format === "cdr") {
    try {
      return await convertCdrToPng(buffer);
    } catch (err) {
      if (preview) {
        return rasterizeTemplate(preview.buffer, preview.format);
      }
      throw err;
    }
  }

  throw new BadRequestError("Unsupported template format");
}
