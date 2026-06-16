import { createRequire } from "module";
import path from "path";
import type { PdfToPngOptions, PngPageOutput } from "pdf-to-png-converter";

const requireFromPortal = createRequire(path.join(process.cwd(), "package.json"));

function pdfjsAssetUrl(...segments: string[]): string {
  const pdfjsRoot = path.dirname(requireFromPortal.resolve("pdfjs-dist/package.json"));
  return `${path.join(pdfjsRoot, ...segments).replace(/\\/g, "/")}/`;
}

let pathsPatched = false;

/** pdfjs 6 requires factory URLs to end with `/` (forward slash). pdf-to-png-converter uses `path.sep` on Windows. */
function patchPdfToPngAssetPaths() {
  if (pathsPatched) return;
  pathsPatched = true;

  const converterOutDir = path.dirname(requireFromPortal.resolve("pdf-to-png-converter"));
  const normalizePathModule = requireFromPortal(path.join(converterOutDir, "normalizePath.js")) as {
    normalizePath: (relativePath: string) => string;
  };

  const cMapUrl = pdfjsAssetUrl("cmaps");
  const standardFontDataUrl = pdfjsAssetUrl("standard_fonts");

  const original = normalizePathModule.normalizePath;
  normalizePathModule.normalizePath = (relativePath: string) => {
    if (relativePath.includes("cmaps")) return cMapUrl;
    if (relativePath.includes("standard_fonts")) return standardFontDataUrl;
    return original(relativePath).replace(/\\/g, "/");
  };
}

export async function pdfToPng(
  input: string | ArrayBufferLike | Uint8Array,
  options?: PdfToPngOptions,
): Promise<PngPageOutput[]> {
  patchPdfToPngAssetPaths();
  const { pdfToPng: convert } = await import("pdf-to-png-converter");
  return convert(input, options);
}
