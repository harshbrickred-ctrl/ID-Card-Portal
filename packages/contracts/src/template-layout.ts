import { z } from "zod";

export const TemplateFieldKeySchema = z.enum([
  "name",
  "firstName",
  "lastName",
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
  photoBorder: z.boolean().optional(),
  sourceWidth: z.number().positive().optional(),
  sourceHeight: z.number().positive().optional(),
});

export type TemplateLayoutDto = z.infer<typeof TemplateLayoutSchema>;
export type TemplateFieldKeyDto = z.infer<typeof TemplateFieldKeySchema>;
