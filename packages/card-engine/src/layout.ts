/** Default overlay positions for CR-80 cards (1011×638 px at 300 DPI). */
export type TemplateFieldKey = "name" | "enrollId" | "classSection" | "phone" | "address";

export type TemplateFieldLayout = {
  key: TemplateFieldKey;
  x: number;
  y: number;
  fontSize: number;
  bold?: boolean;
  maxWidth?: number;
  lineHeight?: number;
};

export type TemplateLayout = {
  photo: { x: number; y: number; width: number; height: number };
  fields: TemplateFieldLayout[];
  signature: { x: number; y: number; width: number; height: number };
};

export const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  photo: { x: 50, y: 150, width: 200, height: 250 },
  fields: [
    { key: "name", x: 280, y: 180, fontSize: 32, bold: true, maxWidth: 700 },
    { key: "enrollId", x: 280, y: 235, fontSize: 22, maxWidth: 700 },
    { key: "classSection", x: 280, y: 280, fontSize: 20, maxWidth: 700 },
    { key: "phone", x: 280, y: 325, fontSize: 18, maxWidth: 700 },
    { key: "address", x: 280, y: 365, fontSize: 16, maxWidth: 700, lineHeight: 22 },
  ],
  signature: { x: 700, y: 520, width: 240, height: 90 },
};
