/**
 * Overlay layout field positions on the template for visual calibration.
 * Usage: npm run calibrate:layout
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { resolveTemplatePath } from "./lib/generate-fixtures.mjs";

async function main() {
  const templatePath = await resolveTemplatePath();
  if (!templatePath) throw new Error("No sample-template found in scripts/fixtures");

  const dir = path.dirname(templatePath);
  const base = path.basename(templatePath, path.extname(templatePath));
  const layoutPath = path.join(dir, `${base}.layout.json`);
  const layout = JSON.parse(await readFile(layoutPath, "utf8"));

  const template = await readFile(templatePath);
  const meta = await sharp(template).metadata();
  const sourceW = meta.width ?? 1011;
  const sourceH = meta.height ?? 638;

  const markers = layout.fields
    .map((field) => {
      return `<circle cx="${field.x}" cy="${field.y}" r="8" fill="red" opacity="0.85"/>
<text x="${field.x + 12}" y="${field.y + 4}" font-family="Arial" font-size="18" fill="red">${field.key}</text>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${sourceW}" height="${sourceH}" xmlns="http://www.w3.org/2000/svg">
  ${markers}
</svg>`;

  const outDir = path.resolve("scripts/output");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "layout-calibration.png");
  await sharp(template)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer()
    .then((buf) => writeFile(outPath, buf));

  console.log(`Wrote ${outPath}`);
  console.log("Red dots = field anchor points. Adjust x/y in sample-template.layout.json until dots sit on each value row.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
