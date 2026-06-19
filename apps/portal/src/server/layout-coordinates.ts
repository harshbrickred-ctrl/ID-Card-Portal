import type { TemplateLayoutDto } from "@idportal/contracts";

function scaleNum(value: number, ratio: number) {
  return Math.round(value * ratio);
}

/** Remap layout coords when the print PNG size differs from what was used in the editor. */
export function remapLayoutDimensions(
  layout: TemplateLayoutDto,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): TemplateLayoutDto {
  if (fromWidth === toWidth && fromHeight === toHeight) {
    return { ...layout, sourceWidth: toWidth, sourceHeight: toHeight };
  }

  const sx = toWidth / fromWidth;
  const sy = toHeight / fromHeight;
  const fontScale = Math.min(sx, sy);

  return {
    ...layout,
    sourceWidth: toWidth,
    sourceHeight: toHeight,
    photo: {
      x: scaleNum(layout.photo.x, sx),
      y: scaleNum(layout.photo.y, sy),
      width: scaleNum(layout.photo.width, sx),
      height: scaleNum(layout.photo.height, sy),
    },
    signature: {
      x: scaleNum(layout.signature.x, sx),
      y: scaleNum(layout.signature.y, sy),
      width: scaleNum(layout.signature.width, sx),
      height: scaleNum(layout.signature.height, sy),
    },
    fields: layout.fields.map((field) => ({
      ...field,
      x: scaleNum(field.x, sx),
      y: scaleNum(field.y, sy),
      fontSize: Math.max(10, scaleNum(field.fontSize, fontScale)),
      maxWidth: field.maxWidth ? scaleNum(field.maxWidth, sx) : undefined,
      lineHeight: field.lineHeight ? scaleNum(field.lineHeight, sy) : undefined,
      labelX: field.labelX != null ? scaleNum(field.labelX, sx) : undefined,
      labelY: field.labelY != null ? scaleNum(field.labelY, sy) : undefined,
      labelFontSize: field.labelFontSize ? scaleNum(field.labelFontSize, fontScale) : undefined,
    })),
  };
}
