import { BadRequestError } from "@idportal/api-kit";

/** New uploads: PNG/JPG only. `pdf` remains for legacy templates already stored. */
export type TemplateSourceFormat = "png" | "jpg" | "webp" | "pdf";

const LAYOUT_UPLOAD_EXT = new Set(["png", "jpg", "jpeg"]);
const LAYOUT_UPLOAD_MIME: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

export function resolveTemplateFormat(file: File): TemplateSourceFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "cdr") {
    throw new BadRequestError(
      "CDR is not supported. Export PNG or JPG from your design tool (85.6×53.98 mm at 300 DPI for CR-80) and upload that instead.",
    );
  }
  if (ext === "pdf" || file.type === "application/pdf") {
    throw new BadRequestError(
      "PDF templates are not supported. Export PNG or JPG from CorelDRAW/Canva and upload the image.",
    );
  }
  if (ext === "jpeg" || ext === "jpg") return "jpg";
  if (ext === "png") return "png";
  if (file.type && LAYOUT_UPLOAD_MIME[file.type]) return LAYOUT_UPLOAD_MIME[file.type];
  if (LAYOUT_UPLOAD_EXT.has(ext)) return ext === "jpeg" ? "jpg" : (ext as "png" | "jpg");

  throw new BadRequestError("Template layout must be a PNG or JPG image.");
}

export function isRasterTemplateFormat(format: TemplateSourceFormat) {
  return format === "png" || format === "jpg" || format === "webp";
}
