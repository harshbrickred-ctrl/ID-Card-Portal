import { execFile } from "child_process";
import { access } from "fs/promises";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { BadRequestError } from "@idportal/api-kit";
import { CARD_HEIGHT, CARD_WIDTH } from "@idportal/card-engine";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

type ConvertApiResponse = {
  Files?: { Url?: string; FileData?: string }[];
  Message?: string;
};

const WINDOWS_INKSCAPE_PATHS = [
  "C:\\Program Files\\Inkscape\\bin\\inkscape.exe",
  "C:\\Program Files\\Inkscape\\inkscape.exe",
  "C:\\Program Files (x86)\\Inkscape\\bin\\inkscape.exe",
];

async function normalizeRaster(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "contain", background: "#ffffff" })
    .png()
    .toBuffer();
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getInkscapeCandidates(): Promise<string[]> {
  const candidates = [
    process.env.INKSCAPE_PATH?.trim(),
    "inkscape",
    ...(process.platform === "win32" ? WINDOWS_INKSCAPE_PATHS : []),
  ].filter((value): value is string => Boolean(value));

  const found: string[] = [];
  for (const candidate of candidates) {
    if (candidate.includes(path.sep) || candidate.includes("/")) {
      if (await fileExists(candidate)) found.push(candidate);
    } else {
      found.push(candidate);
    }
  }
  return [...new Set(found)];
}

export function getCdrConversionCapabilities() {
  const convertApi = Boolean(process.env.CONVERTAPI_SECRET?.trim());
  const corelDrawWindows = process.platform === "win32";
  const inkscapeConfigured = Boolean(process.env.INKSCAPE_PATH?.trim());
  const onVercel = process.env.VERCEL === "1";

  return {
    convertApi,
    corelDrawWindows,
    inkscapeConfigured,
    onVercel,
    cdrNeedsFallback: onVercel && !convertApi,
  };
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
  const candidates = await getInkscapeCandidates();

  for (const inkscape of candidates) {
    const result = await withTempCdr(buffer, async (input, tmpDir) => {
      const output = path.join(tmpDir, "template.png");
      await execFileAsync(
        inkscape,
        [input, "--export-type=png", "--export-filename", output, "--export-width", String(CARD_WIDTH)],
        { timeout: 90_000 },
      );
      return normalizeRaster(await readFile(output));
    }).catch(() => null);

    if (result) return result;
  }

  return null;
}

export async function tryCorelDrawWindowsCdr(buffer: Buffer): Promise<Buffer | null> {
  if (process.platform !== "win32") return null;

  const scriptPath = path.join(process.cwd(), "scripts", "export-cdr.ps1");
  if (!(await fileExists(scriptPath))) return null;

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

    const res = await fetch("https://v2.convertapi.com/convert/cdr/to/png", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("ConvertAPI CDR conversion failed:", res.status, errText);
      return null;
    }

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
  } catch (err) {
    console.error("ConvertAPI CDR conversion error:", err);
    return null;
  }
}

function buildCdrHelp(capabilities: ReturnType<typeof getCdrConversionCapabilities>) {
  if (capabilities.onVercel && !capabilities.convertApi) {
    return "CDR auto-conversion on Vercel requires CONVERTAPI_SECRET. Sign up at convertapi.com, add the secret to Vercel env vars, redeploy, or upload an optional PNG/PDF export from CorelDRAW below.";
  }
  if (process.platform === "win32") {
    return "CDR could not be converted. Install Inkscape (inkscape.org), ensure CorelDRAW is installed, set CONVERTAPI_SECRET, or upload an optional PNG/PDF export from CorelDRAW below.";
  }
  return "CDR could not be converted on this server. Set CONVERTAPI_SECRET or upload an optional PNG/PDF export from CorelDRAW below.";
}

export async function convertCdrToPng(buffer: Buffer): Promise<Buffer> {
  const capabilities = getCdrConversionCapabilities();
  const converted =
    (await tryConvertApiCdr(buffer)) ??
    (await tryInkscapeCdr(buffer)) ??
    (await tryCorelDrawWindowsCdr(buffer));

  if (converted) return converted;

  throw new BadRequestError(buildCdrHelp(capabilities));
}
