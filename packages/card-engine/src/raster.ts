import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";

/** Require CR-80 pixel dimensions — no resize (CorelDRAW export path). */
export async function preserveExactTemplateRaster(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w === CARD_WIDTH && h === CARD_HEIGHT) {
    return sharp(buffer).png().toBuffer();
  }

  throw new Error(
    `Template must be exactly ${CARD_WIDTH}×${CARD_HEIGHT} px (CR-80 at 300 DPI). Export from CorelDRAW at 85.6×53.98 mm.`,
  );
}

  // Legacy helper — scales a template raster to CR-80 for CorelDRAW exports and scripts.
export async function fitTemplateRaster(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w === CARD_WIDTH && h === CARD_HEIGHT) {
    return sharp(buffer).png().toBuffer();
  }

  if (w <= 0 || h <= 0) {
    throw new Error("Template image has invalid dimensions");
  }

  // Stretch to CR-80 for legacy CorelDRAW / script paths only.
  return sharp(buffer)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}
