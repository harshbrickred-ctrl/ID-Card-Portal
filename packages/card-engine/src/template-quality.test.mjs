import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARD_HEIGHT, CARD_WIDTH } from "../src/constants.ts";
import {
  clampHealthScore,
  healthGrade,
  overallHealthScore,
  scoreContrast,
  scoreDpi,
  scorePrintability,
  scoreResolution,
} from "../src/template-quality.ts";

describe("template health scores", () => {
  it("scores CR-80 dimensions highly", () => {
    assert.equal(scoreResolution(CARD_WIDTH, CARD_HEIGHT), 100);
    assert.equal(scoreDpi(CARD_WIDTH, CARD_HEIGHT, 300), 100);
  });

  it("penalizes low resolution", () => {
    assert.ok(scoreResolution(500, 320) < 60);
  });

  it("detects heavy JPEG compression in printability", () => {
    const result = scorePrintability({
      resolutionScore: 80,
      edgeVariance: 20,
      bytesPerPixel: 0.08,
      format: "jpeg",
    });
    assert.ok(result.score < 75);
    assert.ok(result.flags.includes("whatsapp"));
  });

  it("computes weighted overall and grade", () => {
    const scores = { resolution: 95, dpi: 100, contrast: 85, printability: 92 };
    const overall = overallHealthScore(scores);
    assert.equal(overall, 93);
    assert.equal(healthGrade(overall), "excellent");
  });

  it("clamps scores to 0-100", () => {
    assert.equal(clampHealthScore(130), 100);
    assert.equal(clampHealthScore(-5), 0);
  });

  it("rewards healthy contrast", () => {
    assert.ok(scoreContrast(60) >= 95);
    assert.ok(scoreContrast(18) < 40);
  });
});
