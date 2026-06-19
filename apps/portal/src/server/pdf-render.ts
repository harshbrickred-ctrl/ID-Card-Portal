import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import type { PdfToPngOptions, PngPageOutput } from "pdf-to-png-converter";

const requireFromThisFile = createRequire(import.meta.url);

function resolvePdfJsRoot(): string {
  const anchors = [
    path.join(process.cwd(), "package.json"),
    path.join(process.cwd(), "../../package.json"),
    fileURLToPath(import.meta.url),
  ];

  for (const anchor of anchors) {
    try {
      const req = createRequire(anchor);
      return path.dirname(req.resolve("pdfjs-dist/package.json"));
    } catch {
      /* try next anchor */
    }
  }

  for (const anchor of anchors) {
    try {
      const req = createRequire(anchor);
      const converterMain = req.resolve("pdf-to-png-converter");
      const reqFromConverter = createRequire(converterMain);
      return path.dirname(reqFromConverter.resolve("pdfjs-dist/package.json"));
    } catch {
      /* try next anchor */
    }
  }

  return path.dirname(requireFromThisFile.resolve("pdfjs-dist/package.json"));
}

function pdfjsAssetUrl(pdfjsRoot: string, ...segments: string[]): string {
  return `${path.join(pdfjsRoot, ...segments).replace(/\\/g, "/")}/`;
}

let pathsPatched = false;

/**
 * pdfjs 6 requires cMapUrl / standardFontDataUrl to end with `/`.
 * pdf-to-png-converter's normalizePath uses `\` on Windows — patch only there.
 * Linux (Vercel) already gets forward slashes; no patch or pdfjs path lookup needed.
 */
function patchPdfToPngAssetPaths() {
  if (pathsPatched) return;
  pathsPatched = true;

  if (process.platform !== "win32") return;

  const portalReq = createRequire(path.join(process.cwd(), "package.json"));
  const converterOutDir = path.dirname(portalReq.resolve("pdf-to-png-converter"));
  const normalizePathModule = portalReq(path.join(converterOutDir, "normalizePath.js")) as {
    normalizePath: (relativePath: string) => string;
  };

  const pdfjsRoot = resolvePdfJsRoot();
  const cMapUrl = pdfjsAssetUrl(pdfjsRoot, "cmaps");
  const standardFontDataUrl = pdfjsAssetUrl(pdfjsRoot, "standard_fonts");

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
