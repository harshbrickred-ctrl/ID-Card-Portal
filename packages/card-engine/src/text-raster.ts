import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createCanvas, registerFont } from "@napi-rs/canvas/node-canvas";
import { CARD_VALUE_TEXT_FILL } from "./constants";

/** Resolve DejaVu from package.json anchors — bundled import.meta.url breaks require.resolve on Turbopack. */
function resolveDejavuFontRoot(): string {
  const anchors = [
    path.join(process.cwd(), "package.json"),
    path.join(process.cwd(), "../../package.json"),
    fileURLToPath(import.meta.url),
  ];

  for (const anchor of anchors) {
    try {
      const req = createRequire(anchor);
      return path.dirname(req.resolve("dejavu-fonts-ttf/package.json"));
    } catch {
      /* try next anchor */
    }
  }

  throw new Error("dejavu-fonts-ttf not found — run npm install at the monorepo root");
}

function cardFontPath(file: "DejaVuSans.ttf" | "DejaVuSans-Bold.ttf"): string {
  return path.join(resolveDejavuFontRoot(), "ttf", file);
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
  registerFont(cardFontPath("DejaVuSans.ttf"), { family: "CardFont" });
  registerFont(cardFontPath("DejaVuSans-Bold.ttf"), { family: "CardFontBold" });
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

  const canvas = createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  for (const item of items) {
    const lineHeight = item.lineHeight ?? Math.round(item.fontSize * 1.35);
    const lineIndex = item.lineIndex ?? 0;
    const fontSize = Math.max(8, Math.round(item.fontSize));
    const fontFamily = item.bold ? "CardFontBold" : "CardFont";
    ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = item.fill ?? CARD_VALUE_TEXT_FILL;
    ctx.textAlign = mapTextAlign(item.anchor);
    ctx.textBaseline = item.baseline === "middle" ? "middle" : "alphabetic";

    const y = item.y + lineIndex * lineHeight;
    ctx.fillText(item.text.normalize("NFKC"), Math.round(item.x), Math.round(y));
  }

  return canvas.toBuffer("image/png");
}
