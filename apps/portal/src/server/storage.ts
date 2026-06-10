import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export function storagePath(...parts: string[]) {
  return path.join(STORAGE_ROOT, ...parts);
}

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function saveFile(relPath: string, data: Buffer) {
  const full = storagePath(relPath);
  await ensureDir(path.dirname(full));
  await writeFile(full, data);
  return relPath;
}

export async function readStorageFile(relPath: string): Promise<Buffer | null> {
  try {
    return await readFile(storagePath(relPath));
  } catch {
    return null;
  }
}

export async function deleteStorageFile(relPath: string) {
  try {
    await unlink(storagePath(relPath));
  } catch {
    // ignore missing files
  }
}

export function publicFileUrl(relPath: string) {
  return `/api/files/${relPath.split(path.sep).join("/")}`;
}
