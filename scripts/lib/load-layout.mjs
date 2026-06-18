import { access, readFile } from "fs/promises";
import path from "path";
import { scaleTemplateLayout } from "../../packages/card-engine/src/layout.ts";

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load `<template>.layout.json` next to the template image, if present.
 * @param {string} templatePath
 */
export async function loadTemplateLayout(templatePath) {
  const dir = path.dirname(templatePath);
  const base = path.basename(templatePath, path.extname(templatePath));
  const candidates = [
    path.join(dir, `${base}.layout.json`),
    path.join(dir, "sample-template.layout.json"),
  ];

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) continue;
    const raw = JSON.parse(await readFile(candidate, "utf8"));
    return scaleTemplateLayout(raw);
  }

  return null;
}
