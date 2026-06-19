import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CARD_HEIGHT, CARD_WIDTH } from "../src/constants.ts";
import { scaleTemplateLayout } from "../src/layout.ts";
import { createDefaultLayoutForSource } from "@idportal/contracts";

describe("scaleTemplateLayout", () => {
  it("scales coordinates from source design size to CR-80", () => {
    const scaled = scaleTemplateLayout({
      sourceWidth: 1576,
      sourceHeight: 998,
      photoBorder: false,
      photo: { x: 100, y: 200, width: 300, height: 400 },
      signature: { x: 1000, y: 900, width: 300, height: 80 },
      fields: [{ key: "name", x: 800, y: 300, fontSize: 40, maxWidth: 700 }],
    });

    assert.equal(scaled.photo.x, Math.round((100 * CARD_WIDTH) / 1576));
    assert.equal(scaled.photo.y, Math.round((200 * CARD_HEIGHT) / 998));
    assert.equal(scaled.fields[0].fontSize, Math.round(40 * Math.min(CARD_WIDTH / 1576, CARD_HEIGHT / 998)));
    assert.equal(scaled.photoBorder, false);
  });

  it("returns layout unchanged when no source dimensions", () => {
    const layout = {
      photo: { x: 50, y: 150, width: 200, height: 250 },
      fields: [{ key: "name", x: 280, y: 180, fontSize: 32 }],
      signature: { x: 700, y: 520, width: 240, height: 90 },
    };
    assert.deepEqual(scaleTemplateLayout(layout), layout);
  });
});

describe("createDefaultLayoutForSource", () => {
  it("creates proportional default layout for source dimensions", () => {
    const layout = createDefaultLayoutForSource(1576, 998);
    assert.equal(layout.sourceWidth, 1576);
    assert.equal(layout.sourceHeight, 998);
    assert.ok(layout.fields.length >= 6);
    assert.ok(layout.photo.width > 0);
  });
});
