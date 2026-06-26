import { CARD_HEIGHT, CARD_WIDTH } from "./constants";

/** Default overlay positions for CR-80 cards (1011×638 px at 300 DPI). */
export type TemplateFieldKey =
  | "name"
  | "firstName"
  | "lastName"
  | "enrollId"
  | "classSection"
  | "dob"
  | "phone"
  | "address"
  | "academicYear";

export type TemplateFieldLayout = {
  key: TemplateFieldKey;
  x: number;
  y: number;
  fontSize: number;
  bold?: boolean;
  maxWidth?: number;
  lineHeight?: number;
  fill?: string;
  /** Vertical anchor — use "middle" with y set to the row centre on the template. */
  dominantBaseline?: "auto" | "middle";
  textAnchor?: "start" | "middle" | "end";
  showLabel?: boolean;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelFontSize?: number;
  labelFill?: string;
};

export const DEFAULT_FIELD_LABELS: Record<TemplateFieldKey, string> = {
  name: "Name",
  firstName: "First Name",
  lastName: "Last Name",
  enrollId: "Enroll ID",
  classSection: "Class",
  dob: "DOB",
  phone: "Phone",
  address: "Address",
  academicYear: "Session",
};

export type TemplatePhotoShape = "rectangle" | "circle" | "ellipse";

export type TemplateLayout = {
  photo: { x: number; y: number; width: number; height: number };
  fields: TemplateFieldLayout[];
  signature: { x: number; y: number; width: number; height: number };
  /** Clip student photo to match the template frame. */
  photoShape?: TemplatePhotoShape;
  /** When true, draws a decorative frame around the photo (usually off when the artwork already has one). */
  photoBorder?: boolean;
  /** Layout coords are in this design size; scaled to CR-80 at render time. */
  sourceWidth?: number;
  sourceHeight?: number;
};

function scaleNum(value: number, ratio: number) {
  return Math.round(value * ratio);
}

/** Map a layout authored at sourceWidth×sourceHeight onto a target print canvas. */
export function scaleTemplateLayout(
  layout: TemplateLayout,
  targetWidth: number = CARD_WIDTH,
  targetHeight: number = CARD_HEIGHT,
): TemplateLayout {
  if (!layout.sourceWidth || !layout.sourceHeight) return layout;
  if (layout.sourceWidth === targetWidth && layout.sourceHeight === targetHeight) return layout;

  const sx = targetWidth / layout.sourceWidth;
  const sy = targetHeight / layout.sourceHeight;

  return {
    ...layout,
    photoBorder: layout.photoBorder,
    photoShape: layout.photoShape,
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
      fontSize: scaleNum(field.fontSize, Math.min(sx, sy)),
      maxWidth: field.maxWidth ? scaleNum(field.maxWidth, sx) : undefined,
      lineHeight: field.lineHeight ? scaleNum(field.lineHeight, sy) : undefined,
      labelX: field.labelX != null ? scaleNum(field.labelX, sx) : undefined,
      labelY: field.labelY != null ? scaleNum(field.labelY, sy) : undefined,
      labelFontSize: field.labelFontSize
        ? scaleNum(field.labelFontSize, Math.min(sx, sy))
        : undefined,
    })),
  };
}

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  photoBorder: false,
  photoShape: "rectangle",
  photo: { x: 50, y: 150, width: 200, height: 250 },
  fields: [
    {
      key: "name",
      x: 380,
      y: 180,
      fontSize: 32,
      bold: true,
      maxWidth: 600,
      showLabel: false,
      labelX: 280,
    },
    {
      key: "enrollId",
      x: 380,
      y: 235,
      fontSize: 22,
      maxWidth: 600,
      showLabel: false,
      labelX: 280,
    },
    {
      key: "classSection",
      x: 380,
      y: 280,
      fontSize: 20,
      maxWidth: 600,
      showLabel: false,
      labelX: 280,
    },
    {
      key: "dob",
      x: 380,
      y: 325,
      fontSize: 20,
      maxWidth: 600,
      showLabel: false,
      labelX: 280,
    },
    {
      key: "phone",
      x: 380,
      y: 370,
      fontSize: 18,
      maxWidth: 600,
      showLabel: false,
      labelX: 280,
    },
    {
      key: "address",
      x: 380,
      y: 410,
      fontSize: 16,
      maxWidth: 600,
      lineHeight: 22,
      showLabel: false,
      labelX: 280,
    },
  ],
  signature: { x: 700, y: 520, width: 240, height: 90 },
};

export { createDefaultLayoutForSource } from "@idportal/contracts";
