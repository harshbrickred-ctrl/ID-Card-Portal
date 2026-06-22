import { TemplateLayoutSchema, type TemplateLayoutDto } from "@idportal/contracts";
import type { TemplateLayout } from "@idportal/card-engine";

export function parseTemplateLayoutJson(raw: unknown): TemplateLayout {
  return TemplateLayoutSchema.parse(raw) as TemplateLayoutDto;
}

export function parseTemplateLayoutJsonOrNull(raw: unknown): TemplateLayout | null {
  if (raw == null) return null;
  try {
    return parseTemplateLayoutJson(raw);
  } catch {
    return null;
  }
}
