import { execFile } from "child_process";
import { access, realpath } from "fs/promises";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { BadRequestError } from "@idportal/api-kit";
import { preserveExactTemplateRaster } from "@idportal/card-engine";

const execFileAsync = promisify(execFile);

const COREL_COM_PROG_IDS = [
  "CorelDRAW.Application",
  "CorelDRAW.Application.27",
  "CorelDRAW.Application.26",
  "CorelDRAW.Application.25",
  "CorelDRAW.Application.24",
  "CorelDRW.Application",
];

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectCorelDrawInstall(): Promise<{
  storeEdition: boolean;
  version: string | null;
}> {
  if (process.platform !== "win32") {
    return { storeEdition: false, version: null };
  }

  const detectScript = path.join(process.cwd(), "scripts", "detect-corel.ps1");
  if (!(await fileExists(detectScript))) {
    return { storeEdition: false, version: null };
  }

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", detectScript],
      { timeout: 45_000 },
    );
    const output = stdout.trim();
    if (output.includes("|STORE")) {
      return { storeEdition: true, version: output.split("|")[0] || null };
    }
  } catch {
    // ignore
  }

  return { storeEdition: false, version: null };
}

export async function isCorelDrawAvailable(): Promise<boolean> {
  if (process.platform !== "win32") return false;

  for (const progId of COREL_COM_PROG_IDS) {
    try {
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `$ErrorActionPreference='Stop'; $c = New-Object -ComObject '${progId}'; $c.Quit()`,
        ],
        { timeout: 45_000 },
      );
      return true;
    } catch {
      // try next ProgID
    }
  }

  return false;
}

function canAutoExportLocally(corelDrawComAutomation: boolean, corelDrawStoreEdition: boolean, onVercel: boolean) {
  if (onVercel) return false;
  return corelDrawComAutomation || corelDrawStoreEdition;
}

export async function getCdrConversionCapabilities() {
  const onVercel = process.env.VERCEL === "1";
  const corelDrawWindows = process.platform === "win32";
  const install = corelDrawWindows ? await detectCorelDrawInstall() : { storeEdition: false, version: null };
  const corelDrawComAutomation = corelDrawWindows ? await isCorelDrawAvailable() : false;
  const corelDrawStoreEdition = install.storeEdition;
  const corelDrawDetected = corelDrawComAutomation || corelDrawStoreEdition;
  const cdrAutoExport = canAutoExportLocally(corelDrawComAutomation, corelDrawStoreEdition, onVercel);

  return {
    corelDrawWindows,
    corelDrawInstalled: corelDrawComAutomation,
    corelDrawComAutomation,
    corelDrawStoreEdition,
    corelDrawDetected,
    corelDrawVersion: install.version,
    cdrAutoExport,
    onVercel,
    cdrNeedsExport: !cdrAutoExport,
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

async function toWindowsLongPath(filePath: string): Promise<string> {
  if (process.platform !== "win32") return filePath;
  try {
    const resolved = await realpath(path.dirname(filePath));
    return path.join(resolved, path.basename(filePath));
  } catch {
    return filePath;
  }
}

async function runExportScript(scriptName: string, input: string, output: string, timeoutMs: number) {
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);
  if (!(await fileExists(scriptPath))) {
    throw new BadRequestError(`CorelDRAW export script is missing: ${scriptName}`);
  }

  const inputPath = await toWindowsLongPath(input);
  const outputPath = await toWindowsLongPath(output);

  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-InputPath",
      inputPath,
      "-OutputPath",
      outputPath,
    ],
    { timeout: timeoutMs },
  );
}

async function exportWithCorelDrawCom(input: string, output: string) {
  await runExportScript("export-cdr.ps1", input, output, 180_000);
}

async function exportWithCorelDrawStore(input: string, output: string) {
  await runExportScript("export-cdr-store.ps1", input, output, 300_000);
}

async function exportWithCorelDraw(buffer: Buffer): Promise<Buffer> {
  if (process.platform !== "win32") {
    throw new BadRequestError("CDR conversion requires Windows with CorelDRAW installed.");
  }

  const install = await detectCorelDrawInstall();
  const comAvailable = await isCorelDrawAvailable();

  if (!comAvailable && !install.storeEdition) {
    throw new BadRequestError(
      "CorelDRAW is not installed. Install CorelDRAW (Store or Graphics Suite), or upload a PNG/PDF export (1011×638 px).",
    );
  }

  return withTempCdr(buffer, async (input, tmpDir) => {
    const output = path.join(tmpDir, "template.png");
    try {
      if (comAvailable) {
        await exportWithCorelDrawCom(input, output);
      } else {
        await exportWithCorelDrawStore(input, output);
      }
      return await preserveExactTemplateRaster(await readFile(output));
    } catch (err) {
      const message = err instanceof Error ? err.message : "CorelDRAW export failed";
      if (install.storeEdition) {
        throw new BadRequestError(
          `${message} Store Edition export opens CorelDRAW briefly on this PC. Keep the server unlocked, or export PNG (1011×638 px) manually and attach it.`,
        );
      }
      throw new BadRequestError(message);
    }
  });
}

export async function convertCdrToPng(buffer: Buffer): Promise<Buffer> {
  return exportWithCorelDraw(buffer);
}
