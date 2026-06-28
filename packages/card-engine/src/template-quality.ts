import sharp from "sharp";
import { CARD_HEIGHT, CARD_WIDTH } from "./constants";

const CR80_WIDTH_MM = 85.6;
const CR80_HEIGHT_MM = 53.98;
const TARGET_DPI = 300;
const CR80_ASPECT = CARD_WIDTH / CARD_HEIGHT;

export type TemplateHealthGrade = "excellent" | "good" | "fair" | "poor";

export type TemplateHealthScores = {
  resolution: number;
  dpi: number;
  contrast: number;
  printability: number;
};

export type TemplateHealthReport = {
  overall: number;
  scores: TemplateHealthScores;
  grade: TemplateHealthGrade;
  warnings: string[];
  tips: string[];
  width: number;
  height: number;
  cr80Width: number;
  cr80Height: number;
  matchesCr80: boolean;
  format: string | null;
  effectiveDpi: number | null;
  bytesPerPixel: number;
  analyzedAt: string;
};

/** @deprecated Use TemplateHealthReport */
export type TemplateQualityReport = TemplateHealthReport;

export function clampHealthScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreResolution(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0;

  const widthRatio = width / CARD_WIDTH;
  const heightRatio = height / CARD_HEIGHT;
  const dimensionScore = Math.min(widthRatio, heightRatio) * 100;

  const aspectActual = width / height;
  const aspectDelta = Math.abs(aspectActual - CR80_ASPECT) / CR80_ASPECT;
  const aspectPenalty = Math.min(25, aspectDelta * 100);

  return clampHealthScore(dimensionScore - aspectPenalty * 0.35);
}

export function scoreDpi(width: number, height: number, density: number | null | undefined): number {
  let effectiveDpi: number;
  if (density && density > 0) {
    effectiveDpi = density;
  } else if (width > 0 && height > 0) {
    const widthInches = CR80_WIDTH_MM / 25.4;
    const heightInches = CR80_HEIGHT_MM / 25.4;
    effectiveDpi = Math.min(width / widthInches, height / heightInches);
  } else {
    return 0;
  }

  if (effectiveDpi >= TARGET_DPI) return 100;
  if (effectiveDpi >= 240) return clampHealthScore(85 + ((effectiveDpi - 240) / 60) * 15);
  if (effectiveDpi >= 200) return clampHealthScore(70 + ((effectiveDpi - 200) / 40) * 15);
  if (effectiveDpi >= 150) return clampHealthScore(50 + ((effectiveDpi - 150) / 50) * 20);
  return clampHealthScore((effectiveDpi / 150) * 50);
}

export function scoreContrast(luminanceStdev: number): number {
  if (luminanceStdev >= 58) return 100;
  if (luminanceStdev >= 42) return clampHealthScore(75 + ((luminanceStdev - 42) / 16) * 25);
  if (luminanceStdev >= 28) return clampHealthScore(55 + ((luminanceStdev - 28) / 14) * 20);
  if (luminanceStdev >= 15) return clampHealthScore(30 + ((luminanceStdev - 15) / 13) * 25);
  return clampHealthScore((luminanceStdev / 15) * 30);
}

export function scorePrintability(input: {
  resolutionScore: number;
  edgeVariance: number;
  bytesPerPixel: number;
  format: string | null;
}): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 100;

  if (input.edgeVariance < 7) {
    score -= 38;
    flags.push("blur");
  } else if (input.edgeVariance < 14) {
    score -= 20;
    flags.push("soft");
  } else if (input.edgeVariance < 22) {
    score -= 8;
  }

  const isJpeg = input.format === "jpeg" || input.format === "jpg";
  if (isJpeg && input.bytesPerPixel < 0.1) {
    score -= 32;
    flags.push("whatsapp");
  } else if (isJpeg && input.bytesPerPixel < 0.18) {
    score -= 18;
    flags.push("jpeg_heavy");
  } else if (isJpeg && input.bytesPerPixel < 0.28) {
    score -= 8;
  }

  if (input.resolutionScore < 55) score -= 22;
  else if (input.resolutionScore < 75) score -= 10;

  return { score: clampHealthScore(score), flags };
}

export function overallHealthScore(scores: TemplateHealthScores): number {
  return clampHealthScore(
    scores.resolution * 0.25 +
      scores.dpi * 0.25 +
      scores.contrast * 0.2 +
      scores.printability * 0.3,
  );
}

export function healthGrade(overall: number): TemplateHealthGrade {
  if (overall >= 90) return "excellent";
  if (overall >= 75) return "good";
  if (overall >= 60) return "fair";
  return "poor";
}

function buildWarnings(
  scores: TemplateHealthScores,
  printFlags: string[],
): { warnings: string[]; tips: string[] } {
  const warnings: string[] = [];
  const tips: string[] = [];

  if (scores.resolution < 70) {
    warnings.push("Template resolution too low");
    tips.push(`Export at ${CARD_WIDTH}×${CARD_HEIGHT}px (CR-80 @ 300 DPI) for sharp print output.`);
  }

  if (scores.dpi < 70) {
    warnings.push("Effective DPI below print quality — export at 300 DPI");
    tips.push("In CorelDRAW/Canva, set export to 300 DPI before saving PNG or JPG.");
  }

  if (printFlags.includes("whatsapp")) {
    warnings.push("Image appears to be WhatsApp compressed");
    tips.push("Use the original design file export — avoid forwarding images through chat apps.");
  } else if (printFlags.includes("jpeg_heavy")) {
    warnings.push("Heavy JPEG compression detected");
    tips.push("Prefer PNG export from your design tool to preserve text edges.");
  }

  if (printFlags.includes("blur") || printFlags.includes("soft")) {
    warnings.push("Text may appear blurry when printed");
    tips.push("Re-export from the source design at full resolution without resizing.");
  }

  if (scores.contrast < 65) {
    warnings.push("Low contrast — printed text may be hard to read");
    tips.push("Ensure text and field areas have strong contrast against the card background.");
  }

  if (warnings.length === 0) {
    tips.push("Template health looks good — proceed to Edit layout and map student fields.");
  }

  return { warnings, tips };
}

function inferEffectiveDpi(width: number, height: number, density: number | null | undefined): number | null {
  if (density && density > 0) return Math.round(density);
  if (width <= 0 || height <= 0) return null;
  const widthInches = CR80_WIDTH_MM / 25.4;
  const heightInches = CR80_HEIGHT_MM / 25.4;
  return Math.round(Math.min(width / widthInches, height / heightInches));
}

export async function assessTemplateHealth(imageBuffer: Buffer): Promise<TemplateHealthReport> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const format = meta.format ?? null;
  const density = meta.density ?? null;
  const bytesPerPixel = width > 0 && height > 0 ? imageBuffer.length / (width * height) : 0;

  const greyStats = await sharp(imageBuffer).greyscale().stats();
  const luminanceStdev = greyStats.channels[0]?.stdev ?? 0;

  const laplacianKernel = {
    width: 3,
    height: 3,
    kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0],
  };
  const edgeStats = await sharp(imageBuffer).greyscale().convolve(laplacianKernel).stats();
  const edgeVariance = edgeStats.channels[0]?.stdev ?? 0;

  const widthDeltaPercent = width > 0 ? Math.abs(width - CARD_WIDTH) / CARD_WIDTH * 100 : 100;
  const heightDeltaPercent = height > 0 ? Math.abs(height - CARD_HEIGHT) / CARD_HEIGHT * 100 : 100;
  const matchesCr80 = widthDeltaPercent <= 2 && heightDeltaPercent <= 2;

  const resolution = scoreResolution(width, height);
  const dpi = scoreDpi(width, height, density);
  const contrast = scoreContrast(luminanceStdev);
  const { score: printability, flags } = scorePrintability({
    resolutionScore: resolution,
    edgeVariance,
    bytesPerPixel,
    format,
  });

  const scores: TemplateHealthScores = { resolution, dpi, contrast, printability };
  const overall = overallHealthScore(scores);
  const { warnings, tips } = buildWarnings(scores, flags);

  const aspect = width / height;
  if (width > 0 && height > 0 && Math.abs(aspect - CR80_ASPECT) / CR80_ASPECT > 0.12) {
    warnings.push("Template aspect ratio doesn't match CR-80 ID card — crop to the card face only");
    tips.unshift("Upload only the card artwork (landscape 1011×638 px), not a full page screenshot.");
  }
  if (density != null && density > 0 && density < 150 && !matchesCr80) {
    warnings.push("PNG was exported at screen resolution (~72 DPI) — re-export at 300 DPI");
  }

  return {
    overall,
    scores,
    grade: healthGrade(overall),
    warnings,
    tips,
    width,
    height,
    cr80Width: CARD_WIDTH,
    cr80Height: CARD_HEIGHT,
    matchesCr80,
    format,
    effectiveDpi: inferEffectiveDpi(width, height, density),
    bytesPerPixel: Math.round(bytesPerPixel * 1000) / 1000,
    analyzedAt: new Date().toISOString(),
  };
}

/** Dimension-only check kept for lightweight callers. */
export function assessTemplateQuality(width: number, height: number): Pick<
  TemplateHealthReport,
  "width" | "height" | "cr80Width" | "cr80Height" | "matchesCr80" | "warnings" | "tips"
> & { resolutionGrade: "excellent" | "good" | "low" } {
  const resolution = scoreResolution(width, height);
  const matchesCr80 =
    Math.abs(width - CARD_WIDTH) / CARD_WIDTH * 100 <= 2 &&
    Math.abs(height - CARD_HEIGHT) / CARD_HEIGHT * 100 <= 2;

  const warnings: string[] = [];
  const tips: string[] = [];
  if (resolution < 70) {
    warnings.push("Template resolution too low");
    tips.push(`Target ${CARD_WIDTH}×${CARD_HEIGHT}px for CR-80 cards.`);
  }
  if (matchesCr80 && resolution >= 90) {
    tips.push("Template size looks perfect for CR-80 printing.");
  }

  let resolutionGrade: "excellent" | "good" | "low" = "good";
  if (resolution >= 90) resolutionGrade = "excellent";
  else if (resolution < 55) resolutionGrade = "low";

  return {
    width,
    height,
    cr80Width: CARD_WIDTH,
    cr80Height: CARD_HEIGHT,
    matchesCr80,
    resolutionGrade,
    warnings,
    tips,
  };
}

export function parseTemplateHealthReport(value: unknown): TemplateHealthReport | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const scores = v.scores as Record<string, unknown> | undefined;
  if (
    typeof v.overall !== "number" ||
    !scores ||
    typeof scores.resolution !== "number" ||
    typeof scores.dpi !== "number" ||
    typeof scores.contrast !== "number" ||
    typeof scores.printability !== "number"
  ) {
    return null;
  }
  return value as TemplateHealthReport;
}
