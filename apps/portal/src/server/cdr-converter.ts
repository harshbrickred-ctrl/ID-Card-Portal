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

type CloudConvertTask = {
  id: string;
  name?: string;
  operation: string;
  status: string;
  message?: string | null;
  result?: {
    form?: { url: string; parameters: Record<string, string> };
    files?: { url: string }[];
  };
};

type CloudConvertJob = {
  data: {
    id: string;
    status: string;
    tasks: CloudConvertTask[];
  };
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const cloudConvert = Boolean(process.env.CLOUDCONVERT_API_KEY?.trim());
  const convertApi = Boolean(
    process.env.CONVERTAPI_SECRET?.trim() || process.env.CONVERTAPI_TOKEN?.trim(),
  );
  const corelDrawWindows = process.platform === "win32";
  const inkscapeConfigured = Boolean(process.env.INKSCAPE_PATH?.trim());
  const onVercel = process.env.VERCEL === "1";

  return {
    cloudConvert,
    convertApi,
    corelDrawWindows,
    inkscapeConfigured,
    onVercel,
    cdrNeedsFallback: onVercel && !cloudConvert,
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

async function pollCloudConvertJob(jobId: string, apiKey: string, maxWaitMs = 120_000): Promise<CloudConvertJob> {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const res = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`CloudConvert poll failed (${res.status}): ${errText}`);
    }

    const json = (await res.json()) as CloudConvertJob;
    if (json.data.status === "finished") return json;
    if (json.data.status === "error") {
      const failedTask = json.data.tasks.find((task) => task.status === "error");
      throw new Error(failedTask?.message ?? "CloudConvert job failed");
    }

    await sleep(2_000);
  }

  throw new Error("CloudConvert conversion timed out after 2 minutes");
}

export async function tryCloudConvertCdr(buffer: Buffer): Promise<Buffer | null> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const createRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-cdr": { operation: "import/upload" },
          "convert-cdr": {
            operation: "convert",
            input: "import-cdr",
            input_format: "cdr",
            output_format: "png",
            width: CARD_WIDTH,
          },
          "export-png": {
            operation: "export/url",
            input: "convert-cdr",
          },
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      console.error("CloudConvert job create failed:", createRes.status, errText);
      return null;
    }

    const job = (await createRes.json()) as CloudConvertJob;
    const uploadTask = job.data.tasks.find((task) => task.operation === "import/upload");
    const form = uploadTask?.result?.form;
    if (!form) {
      console.error("CloudConvert import/upload task missing upload form");
      return null;
    }

    const uploadBody = new FormData();
    for (const [key, value] of Object.entries(form.parameters)) {
      uploadBody.append(key, value);
    }
    uploadBody.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: "application/vnd.corel-draw" }),
      "template.cdr",
    );

    const uploadRes = await fetch(form.url, { method: "POST", body: uploadBody });
    if (!uploadRes.ok) {
      console.error("CloudConvert upload failed:", uploadRes.status, await uploadRes.text().catch(() => ""));
      return null;
    }

    const finished = await pollCloudConvertJob(job.data.id, apiKey);
    const exportTask = finished.data.tasks.find((task) => task.operation === "export/url");
    const fileUrl = exportTask?.result?.files?.[0]?.url;
    if (!fileUrl) {
      console.error("CloudConvert export task missing file URL");
      return null;
    }

    const img = await fetch(fileUrl);
    if (!img.ok) return null;
    return normalizeRaster(Buffer.from(await img.arrayBuffer()));
  } catch (err) {
    console.error("CloudConvert CDR conversion error:", err);
    return null;
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

/** @deprecated ConvertAPI does not support CDR — kept for potential future formats */
export async function tryConvertApiCdr(buffer: Buffer): Promise<Buffer | null> {
  const secret =
    process.env.CONVERTAPI_SECRET?.trim() || process.env.CONVERTAPI_TOKEN?.trim();
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
  if (capabilities.onVercel && !capabilities.cloudConvert) {
    return "CDR auto-conversion on Vercel requires CLOUDCONVERT_API_KEY (ConvertAPI does not support CDR). Sign up at cloudconvert.com, add the API key to Vercel env vars, redeploy, or upload a PNG/PDF export from CorelDRAW below.";
  }
  if (capabilities.cloudConvert) {
    return "CDR conversion via CloudConvert failed. Check your CLOUDCONVERT_API_KEY and account quota, or upload a PNG/PDF export from CorelDRAW below.";
  }
  if (capabilities.convertApi && !capabilities.cloudConvert) {
    return "CONVERTAPI_SECRET does not support CDR files. Use CLOUDCONVERT_API_KEY for cloud conversion, install Inkscape/CorelDRAW locally, or upload a PNG/PDF export from CorelDRAW below.";
  }
  if (process.platform === "win32") {
    return "CDR could not be converted. Install Inkscape (inkscape.org), ensure CorelDRAW is installed, set CLOUDCONVERT_API_KEY, or upload a PNG/PDF export from CorelDRAW below.";
  }
  return "CDR could not be converted on this server. Set CLOUDCONVERT_API_KEY or upload a PNG/PDF export from CorelDRAW below.";
}

export async function convertCdrToPng(buffer: Buffer): Promise<Buffer> {
  const capabilities = getCdrConversionCapabilities();
  const converted =
    (await tryCloudConvertCdr(buffer)) ??
    (await tryInkscapeCdr(buffer)) ??
    (await tryCorelDrawWindowsCdr(buffer));

  if (converted) return converted;

  throw new BadRequestError(buildCdrHelp(capabilities));
}
