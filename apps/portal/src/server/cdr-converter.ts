import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { BadRequestError } from "@idportal/api-kit";
import { CARD_WIDTH } from "@idportal/card-engine";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

type ConvertApiResponse = {
  Files?: { Url?: string; FileData?: string }[];
};

async function normalizeRaster(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(CARD_WIDTH, 638, { fit: "contain", background: "#ffffff" })
    .png()
    .toBuffer();
}

async function withTempCdr<T>(buffer: Buffer, run: (input: string, tmpDir: string) => Promise<T>): Promise<T> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "idportal-cdr-"));
  const input = path.join(tmpDir, "template.cdr");
  try {
    await writeFile(input, buffer);
    return await run(input, tmpDir);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function tryInkscapeCdr(buffer: Buffer): Promise<Buffer | null> {
  return withTempCdr(buffer, async (input, tmpDir) => {
    const output = path.join(tmpDir, "template.png");
    const inkscape = process.env.INKSCAPE_PATH?.trim() || "inkscape";
    await execFileAsync(
      inkscape,
      [input, "--export-type=png", "--export-filename", output, "--export-width", String(CARD_WIDTH)],
      { timeout: 90_000 },
    );
    return normalizeRaster(await readFile(output));
  }).catch(() => null);
}

export async function tryCorelDrawWindowsCdr(buffer: Buffer): Promise<Buffer | null> {
  if (process.platform !== "win32") return null;

  const scriptPath = path.join(process.cwd(), "scripts", "export-cdr.ps1");

  return withTempCdr(buffer, async (input, tmpDir) => {
    const output = path.join(tmpDir, "template.png");
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-InputPath", input, "-OutputPath", output],
      { timeout: 120_000 },
    );
    return normalizeRaster(await readFile(output));
  }).catch(() => null);
}

export async function tryConvertApiCdr(buffer: Buffer): Promise<Buffer | null> {
  const secret = process.env.CONVERTAPI_SECRET?.trim();
  if (!secret) return null;

  try {
    const body = new FormData();
    body.append("File", new Blob([new Uint8Array(buffer)], { type: "application/octet-stream" }), "template.cdr");

    const res = await fetch(
      `https://v2.convertapi.com/convert/cdr/to/png?Secret=${encodeURIComponent(secret)}`,
      { method: "POST", body },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as ConvertApiResponse;
    const file = json.Files?.[0];
    if (file?.FileData) {
      return normalizeRaster(Buffer.from(file.FileData, "base64"));
    }
    if (file?.Url) {
      const img = await fetch(file.Url);
      if (!img.ok) return null;
      return normalizeRaster(Buffer.from(await img.arrayBuffer()));
    }
    return null;
  } catch {
    return null;
  }
}

export async function convertCdrToPng(buffer: Buffer): Promise<Buffer> {
  const converted =
    (await tryInkscapeCdr(buffer)) ??
    (await tryCorelDrawWindowsCdr(buffer)) ??
    (await tryConvertApiCdr(buffer));

  if (converted) return converted;

  throw new BadRequestError(
    "Could not convert CDR to PNG on this server. Install Inkscape locally, use Windows with CorelDRAW installed, set CONVERTAPI_SECRET for cloud conversion, or add an optional PNG/PDF export file.",
  );
}
