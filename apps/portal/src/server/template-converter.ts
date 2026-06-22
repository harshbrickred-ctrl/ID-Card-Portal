import { BadRequestError } from "@idportal/api-kit";
import sharp from "sharp";
import type { TemplateSourceFormat } from "./template-utils";
import { isRasterTemplateFormat } from "./template-utils";
import { pdfToPng } from "./pdf-render";

const PDF_PAGE_OPTS = {
  disableFontFace: true,
  useSystemFonts: true,
  pagesToProcess: [1] as number[],
};

/** Render PDF pages at print resolution without cropping to CR-80. */
const PDF_RENDER_DPI = 300;
const PDF_BASE_DPI = 72;
const PDF_MAX_SIDE_PX = 4096;

async function rasterizePdf(buffer: Buffer): Promise<Buffer> {
  const metadata = await pdfToPng(buffer, {
    ...PDF_PAGE_OPTS,
    returnMetadataOnly: true,
    viewportScale: 1,
  });
  const meta = metadata[0];
  if (!meta || meta.width <= 0 || meta.height <= 0) {
    throw new BadRequestError("PDF template has no pages to render");
  }

  let viewportScale = PDF_RENDER_DPI / PDF_BASE_DPI;
  const scaledW = meta.width * viewportScale;
  const scaledH = meta.height * viewportScale;
  if (scaledW > PDF_MAX_SIDE_PX || scaledH > PDF_MAX_SIDE_PX) {
    viewportScale *= Math.min(PDF_MAX_SIDE_PX / scaledW, PDF_MAX_SIDE_PX / scaledH);
  }

  const pages = await pdfToPng(buffer, {
    ...PDF_PAGE_OPTS,
    viewportScale,
  });
  const first = pages[0];
  if (!first?.content) {
    throw new BadRequestError("PDF template could not be rendered");
  }

  return sharp(Buffer.from(first.content)).png().toBuffer();
}

async function rasterizeRasterUpload(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).png().toBuffer();
}

export async function rasterizeTemplate(buffer: Buffer, format: TemplateSourceFormat): Promise<Buffer> {
  if (isRasterTemplateFormat(format)) {
    return rasterizeRasterUpload(buffer);
  }

  if (format === "pdf") {
    return rasterizePdf(buffer);
  }

  throw new BadRequestError("Unsupported template format");
}
