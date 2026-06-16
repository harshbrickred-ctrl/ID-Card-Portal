import { BadRequestError } from "@idportal/api-kit";
import { CARD_HEIGHT, CARD_WIDTH, fitTemplateRaster, preserveExactTemplateRaster } from "@idportal/card-engine";
import type { TemplateSourceFormat } from "./template-utils";
import { isRasterTemplateFormat } from "./template-utils";
import { pdfToPng } from "./pdf-render";

const PDF_PAGE_OPTS = {
  disableFontFace: true,
  useSystemFonts: true,
  pagesToProcess: [1] as number[],
};

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

  const viewportScale = Math.min(CARD_WIDTH / meta.width, CARD_HEIGHT / meta.height);

  const pages = await pdfToPng(buffer, {
    ...PDF_PAGE_OPTS,
    viewportScale,
  });
  const first = pages[0];
  if (!first?.content) {
    throw new BadRequestError("PDF template could not be rendered");
  }

  const raster = Buffer.from(first.content);
  try {
    return await preserveExactTemplateRaster(raster);
  } catch {
    return fitTemplateRaster(raster);
  }
}

export async function rasterizeTemplate(buffer: Buffer, format: TemplateSourceFormat): Promise<Buffer> {
  if (isRasterTemplateFormat(format)) {
    return fitTemplateRaster(buffer);
  }

  if (format === "pdf") {
    return rasterizePdf(buffer);
  }

  throw new BadRequestError("Unsupported template format");
}
