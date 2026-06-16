import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";

/** Max relative aspect-ratio drift before we center-crop instead of stretch. */
const ASPECT_TOLERANCE = 0.008;

/**
 * Fit a template raster to CR-80 print size (1011×638) without letterboxing.
 * Exact-size images are preserved pixel-for-pixel.
 */
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

  const targetRatio = CARD_WIDTH / CARD_HEIGHT;
  const sourceRatio = w / h;
  const ratioDiff = Math.abs(targetRatio - sourceRatio) / targetRatio;

  if (ratioDiff <= ASPECT_TOLERANCE) {
    return sharp(buffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
  }

  return sharp(buffer)
    .resize(CARD_WIDTH, CARD_HEIGHT, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}
