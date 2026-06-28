import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function cardFontPath(file: "DejaVuSans.ttf" | "DejaVuSans-Bold.ttf"): string {
  const pkgRoot = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
  return path.join(pkgRoot, "ttf", file);
}

export type TextOverlayItem = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fill?: string;
  bold?: boolean;
  anchor?: "start" | "middle" | "end";
  baseline?: "auto" | "middle";
  lineIndex?: number;
  lineHeight?: number;
};

let fontsReady = false;

function ensureCardFonts() {
  if (fontsReady) return;
  const { registerFont } = require("@napi-rs/canvas") as {
    registerFont: (p: string, opts: { family: string; weight?: string }) => void;
  };
  registerFont(cardFontPath("DejaVuSans.ttf"), { family: "CardFont" });
  registerFont(cardFontPath("DejaVuSans-Bold.ttf"), { family: "CardFont", weight: "bold" });
  fontsReady = true;
}

function mapTextAlign(anchor: TextOverlayItem["anchor"]) {
  if (anchor === "middle") return "center";
  if (anchor === "end") return "right";
  return "left";
}

/** Rasterize text with embedded DejaVu fonts (Sharp SVG text often renders as empty boxes). */
export async function renderTextOverlay(
  width: number,
  height: number,
  items: TextOverlayItem[],
): Promise<Buffer> {
  ensureCardFonts();
  const { createCanvas } = require("@napi-rs/canvas") as {
    createCanvas: (w: number, h: number) => {
      getContext: (type: "2d") => {
        clearRect: (x: number, y: number, w: number, h: number) => void;
        font: string;
        fillStyle: string;
        textAlign: string;
        textBaseline: string;
        fillText: (text: string, x: number, y: number) => void;
      };
      toBuffer: (mime: "image/png") => Buffer;
    };
  };

  const canvas = createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  for (const item of items) {
    const lineHeight = item.lineHeight ?? Math.round(item.fontSize * 1.35);
    const lineIndex = item.lineIndex ?? 0;
    const fontSize = Math.max(8, Math.round(item.fontSize));
    const weight = item.bold ? "bold" : "normal";
    ctx.font = `${weight} ${fontSize}px "CardFont", sans-serif`;
    ctx.fillStyle = item.fill ?? "#1a2e4a";
    ctx.textAlign = mapTextAlign(item.anchor);
    ctx.textBaseline = item.baseline === "middle" ? "middle" : "alphabetic";

    const y = item.y + lineIndex * lineHeight;
    ctx.fillText(item.text.normalize("NFKC"), Math.round(item.x), Math.round(y));
  }

  return canvas.toBuffer("image/png");
}
