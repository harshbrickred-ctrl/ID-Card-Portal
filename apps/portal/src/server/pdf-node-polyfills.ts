import { createRequire } from "module";

const requireFromThisFile = createRequire(import.meta.url);

/**
 * pdfjs-dist evaluates `new DOMMatrix()` at module load time. On Vercel the
 * native `@napi-rs/canvas` binary may not resolve in time for pdfjs's own
 * require(), so install the pure-JS geometry polyfill synchronously first.
 */
function installGeometryPolyfills(): void {
  if (typeof globalThis.DOMMatrix !== "undefined") return;

  const geometry = requireFromThisFile("@napi-rs/canvas/geometry.js") as {
    DOMMatrix: typeof globalThis.DOMMatrix;
    DOMPoint: typeof globalThis.DOMPoint;
    DOMRect: typeof globalThis.DOMRect;
  };

  globalThis.DOMMatrix = geometry.DOMMatrix;
  if (typeof globalThis.DOMPoint === "undefined") {
    globalThis.DOMPoint = geometry.DOMPoint;
  }
  if (typeof globalThis.DOMRect === "undefined") {
    globalThis.DOMRect = geometry.DOMRect;
  }
}

/** Path2D / ImageData / canvas rendering need the native skia binding. */
function installNativeCanvasPolyfills(): void {
  try {
    const canvas = requireFromThisFile("@napi-rs/canvas") as {
      ImageData?: typeof ImageData;
      Path2D?: typeof Path2D;
      Path?: typeof Path2D;
    };

    if (typeof globalThis.ImageData === "undefined" && canvas.ImageData) {
      globalThis.ImageData = canvas.ImageData;
    }

    const path2d = canvas.Path2D ?? canvas.Path;
    if (typeof globalThis.Path2D === "undefined" && path2d) {
      globalThis.Path2D = path2d;
    }
  } catch {
    // Module init only needs DOMMatrix; render will fail clearly if native is missing.
  }

  if (!globalThis.navigator?.language) {
    globalThis.navigator = {
      language: "en-US",
      platform: "",
      userAgent: "",
    } as Navigator;
  }
}

installGeometryPolyfills();
installNativeCanvasPolyfills();
