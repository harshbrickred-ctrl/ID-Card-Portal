import { createRequire } from "module";
import path from "path";
import type { PdfToPngOptions, PngPageOutput } from "pdf-to-png-converter";

function resolvePdfJsRoot(): string {
  const anchors = [
    path.join(process.cwd(), "package.json"),
    path.join(process.cwd(), "../../package.json"),
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

  throw new Error(
    "pdfjs-dist is not installed. Run npm install in the monorepo root and redeploy.",
  );
}

function pdfjsAssetUrl(pdfjsRoot: string, ...segments: string[]): string {
  return `${path.join(pdfjsRoot, ...segments).replace(/\\/g, "/")}/`;
}

let pathsPatched = false;

/** pdfjs 6 requires factory URLs to end with `/` (forward slash). pdf-to-png-converter uses `path.sep` on Windows. */
function patchPdfToPngAssetPaths() {
  if (pathsPatched) return;
  pathsPatched = true;

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
