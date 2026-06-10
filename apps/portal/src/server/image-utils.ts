import { BadRequestError } from "@idportal/api-kit";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function resolveImageExtension(file: File): string {
  if (file.type && MIME_TO_EXT[file.type]) return MIME_TO_EXT[file.type];

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "jpeg") return "jpg";
  if (["jpg", "png", "webp"].includes(ext)) return ext;

  throw new BadRequestError("Image must be JPG, PNG, or WebP");
}
