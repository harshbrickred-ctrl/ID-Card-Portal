import { z } from "zod";

export const TemplateFieldKeySchema = z.enum([
  "name",
  "firstName",
  "lastName",
  "fatherName",
  "motherName",
  "enrollId",
  "classSection",
  "dob",
  "phone",
  "address",
  "academicYear",
]);

export const TemplateFieldLayoutSchema = z.object({
  key: TemplateFieldKeySchema,
  x: z.number().finite(),
  y: z.number().finite(),
  fontSize: z.number().positive(),
  bold: z.boolean().optional(),
  maxWidth: z.number().positive().optional(),
  lineHeight: z.number().positive().optional(),
  fill: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  dominantBaseline: z.enum(["auto", "middle"]).optional(),
  textAnchor: z.enum(["start", "middle", "end"]).optional(),
  /** When true, draws a label (e.g. "Name") beside the value — use when the template artwork has no printed labels. */
  showLabel: z.boolean().optional(),
  /** Override default label text for this field key. */
  label: z.string().min(1).max(40).optional(),
  /** Label position when showLabel is true; value stays at x/y. */
  labelX: z.number().finite().optional(),
  labelY: z.number().finite().optional(),
  labelFontSize: z.number().positive().optional(),
  labelFill: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const TemplatePhotoShapeSchema = z.enum(["rectangle", "circle", "ellipse"]);

export const TemplateLayoutSchema = z.object({
  photo: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  fields: z.array(TemplateFieldLayoutSchema).min(1),
  signature: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  /** Clip student photo to rectangle, circle, or ellipse to match the template frame. */
  photoShape: TemplatePhotoShapeSchema.optional(),
  photoBorder: z.boolean().optional(),
  sourceWidth: z.number().positive().optional(),
  sourceHeight: z.number().positive().optional(),
});

export type TemplateLayoutDto = z.infer<typeof TemplateLayoutSchema>;
export type TemplateFieldKeyDto = z.infer<typeof TemplateFieldKeySchema>;

export const TemplateLayoutPreviewSchema = z.object({
  layout: TemplateLayoutSchema,
  studentId: z.string().uuid().optional(),
});

export type TemplateLayoutPreviewDto = z.infer<typeof TemplateLayoutPreviewSchema>;

/** CR-80 print size at 300 DPI — reference for default layout scaling. */
export const CR80_CARD_WIDTH = 1011;
export const CR80_CARD_HEIGHT = 638;

export const DEFAULT_FIELD_LABELS: Record<TemplateFieldKeyDto, string> = {
  name: "Name",
  firstName: "First Name",
  lastName: "Last Name",
  fatherName: "Father Name",
  motherName: "Mother Name",
  enrollId: "Enroll ID",
  classSection: "Class",
  dob: "DOB",
  phone: "Phone",
  address: "Address",
  academicYear: "Session",
};

const DEFAULT_CR80_LAYOUT: TemplateLayoutDto = {
  photoBorder: false,
  photoShape: "rectangle",
  photo: { x: 50, y: 150, width: 200, height: 250 },
  fields: [
    { key: "name", x: 380, y: 180, fontSize: 32, bold: true, maxWidth: 600, showLabel: false, labelX: 280 },
    { key: "enrollId", x: 380, y: 235, fontSize: 22, bold: true, maxWidth: 600, showLabel: false, labelX: 280 },
    { key: "classSection", x: 380, y: 280, fontSize: 20, bold: true, maxWidth: 600, showLabel: false, labelX: 280 },
    { key: "dob", x: 380, y: 325, fontSize: 20, bold: true, maxWidth: 600, showLabel: false, labelX: 280 },
    { key: "phone", x: 380, y: 370, fontSize: 18, bold: true, maxWidth: 600, showLabel: false, labelX: 280 },
    {
      key: "address",
      x: 380,
      y: 410,
      fontSize: 16,
      bold: true,
      maxWidth: 600,
      lineHeight: 22,
      showLabel: false,
      labelX: 280,
    },
  ],
  signature: { x: 700, y: 520, width: 240, height: 90 },
};

function scaleLayoutNum(value: number, ratio: number) {
  return Math.round(value * ratio);
}

/** Starter layout scaled to a template's native pixel dimensions (browser-safe). */
export function createDefaultLayoutForSource(sourceWidth: number, sourceHeight: number): TemplateLayoutDto {
  const sx = sourceWidth / CR80_CARD_WIDTH;
  const sy = sourceHeight / CR80_CARD_HEIGHT;
  const fontScale = Math.min(sx, sy);
  const base = DEFAULT_CR80_LAYOUT;

  return {
    sourceWidth,
    sourceHeight,
    photoBorder: base.photoBorder,
    photoShape: base.photoShape,
    photo: {
      x: scaleLayoutNum(base.photo.x, sx),
      y: scaleLayoutNum(base.photo.y, sy),
      width: scaleLayoutNum(base.photo.width, sx),
      height: scaleLayoutNum(base.photo.height, sy),
    },
    signature: {
      x: scaleLayoutNum(base.signature.x, sx),
      y: scaleLayoutNum(base.signature.y, sy),
      width: scaleLayoutNum(base.signature.width, sx),
      height: scaleLayoutNum(base.signature.height, sy),
    },
    fields: base.fields.map((field) => ({
      ...field,
      x: scaleLayoutNum(field.x, sx),
      y: scaleLayoutNum(field.y, sy),
      fontSize: Math.max(12, scaleLayoutNum(field.fontSize, fontScale)),
      maxWidth: field.maxWidth ? scaleLayoutNum(field.maxWidth, sx) : undefined,
      lineHeight: field.lineHeight ? scaleLayoutNum(field.lineHeight, sy) : undefined,
      labelX: field.labelX != null ? scaleLayoutNum(field.labelX, sx) : undefined,
      labelY: field.labelY != null ? scaleLayoutNum(field.labelY, sy) : undefined,
    })),
  };
}
