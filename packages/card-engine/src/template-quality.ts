import { CARD_HEIGHT, CARD_WIDTH } from "./constants";

export type TemplateQualityReport = {
  width: number;
  height: number;
  cr80Width: number;
  cr80Height: number;
  widthDeltaPercent: number;
  heightDeltaPercent: number;
  matchesCr80: boolean;
  resolutionGrade: "excellent" | "good" | "low";
  warnings: string[];
  tips: string[];
};

export function assessTemplateQuality(width: number, height: number): TemplateQualityReport {
  const widthDeltaPercent = Math.abs(width - CARD_WIDTH) / CARD_WIDTH * 100;
  const heightDeltaPercent = Math.abs(height - CARD_HEIGHT) / CARD_HEIGHT * 100;
  const matchesCr80 = widthDeltaPercent <= 2 && heightDeltaPercent <= 2;

  const warnings: string[] = [];
  const tips: string[] = [];

  if (!matchesCr80) {
    warnings.push(
      `Image is ${width}×${height}px; CR-80 at 300 DPI is ${CARD_WIDTH}×${CARD_HEIGHT}px. Layout coordinates will scale to fit.`,
    );
    tips.push("Re-export from your design tool at 1011×638 px (85.6×53.98 mm @ 300 DPI) for pixel-perfect alignment.");
  }

  let resolutionGrade: TemplateQualityReport["resolutionGrade"] = "good";
  if (width >= CARD_WIDTH && height >= CARD_HEIGHT && matchesCr80) {
    resolutionGrade = "excellent";
  } else if (width < 600 || height < 380) {
    resolutionGrade = "low";
    warnings.push("Resolution is low — printed text and photos may look soft or pixelated.");
    tips.push("Export at 300 DPI or higher before uploading.");
  }

  if (matchesCr80 && resolutionGrade === "excellent") {
    tips.push("Template size looks perfect for CR-80 printing.");
  }

  return {
    width,
    height,
    cr80Width: CARD_WIDTH,
    cr80Height: CARD_HEIGHT,
    widthDeltaPercent: Math.round(widthDeltaPercent * 10) / 10,
    heightDeltaPercent: Math.round(heightDeltaPercent * 10) / 10,
    matchesCr80,
    resolutionGrade,
    warnings,
    tips,
  };
}
