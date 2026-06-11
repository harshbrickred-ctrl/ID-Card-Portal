import { BadRequestError } from "@idportal/api-kit";

export type TemplateSourceFormat = "png" | "jpg" | "webp" | "pdf" | "cdr";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp"]);
const IMAGE_MIME: Record<string, TemplateSourceFormat> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export function resolveTemplateFormat(file: File): TemplateSourceFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "cdr") return "cdr";
  if (ext === "pdf") return "pdf";
  if (ext === "jpeg") return "jpg";
  if (IMAGE_EXT.has(ext)) return ext as TemplateSourceFormat;
  if (file.type && IMAGE_MIME[file.type]) return IMAGE_MIME[file.type];
  if (file.type === "application/pdf") return "pdf";

  throw new BadRequestError("Template must be CDR, PDF, PNG, JPG, or WebP");
}

export function isRasterTemplateFormat(format: TemplateSourceFormat) {
  return format === "png" || format === "jpg" || format === "webp";
}
