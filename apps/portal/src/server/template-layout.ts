import { TemplateLayoutSchema, type TemplateLayoutDto } from "@idportal/contracts";
import { scaleTemplateLayout, type TemplateLayout } from "@idportal/card-engine";

export function parseTemplateLayoutJson(raw: unknown): TemplateLayout {
  const parsed = TemplateLayoutSchema.parse(raw) as TemplateLayoutDto;
  return scaleTemplateLayout(parsed);
}

export function parseTemplateLayoutJsonOrNull(raw: unknown): TemplateLayout | null {
  if (raw == null) return null;
  try {
    return parseTemplateLayoutJson(raw);
  } catch {
    return null;
  }
}
