import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";
import type { TemplateLayout } from "./layout";

export type CardDimensions = { width: number; height: number };

/** Output size for a card: template native dimensions, falling back to CR-80. */
export async function resolveCardDimensions(
  layout?: Pick<TemplateLayout, "sourceWidth" | "sourceHeight"> | null,
  templateBuffer?: Buffer | null,
): Promise<CardDimensions> {
  if (layout?.sourceWidth && layout?.sourceHeight) {
    return { width: layout.sourceWidth, height: layout.sourceHeight };
  }

  if (templateBuffer && templateBuffer.length > 0) {
    const meta = await sharp(templateBuffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
  }

  return { width: CARD_WIDTH, height: CARD_HEIGHT };
}

export function scaleFromCr80(width: number, height: number) {
  return {
    sx: width / CARD_WIDTH,
    sy: height / CARD_HEIGHT,
    fontScale: Math.min(width / CARD_WIDTH, height / CARD_HEIGHT),
  };
}
