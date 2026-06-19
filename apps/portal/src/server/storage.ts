import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function useBlobStorage() {
  // OIDC (BLOB_STORE_ID + VERCEL_OIDC_TOKEN) or legacy BLOB_READ_WRITE_TOKEN
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim());
}

function isRemoteUrl(stored: string) {
  return stored.startsWith("http://") || stored.startsWith("https://");
}

function normalizeRelPath(relPath: string) {
  return relPath.split(path.sep).join("/");
}

function toRelPath(stored: string) {
  return stored.startsWith("/api/files/") ? stored.replace("/api/files/", "") : stored;
}

export function storagePath(...parts: string[]) {
  return path.join(STORAGE_ROOT, ...parts);
}

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

/** Saves a file and returns the storage reference (relative path locally, public URL on Vercel Blob). */
export async function saveFile(relPath: string, data: Buffer): Promise<string> {
  const normalized = normalizeRelPath(relPath);

  if (useBlobStorage()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(normalized, data, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const full = storagePath(normalized);
  await ensureDir(path.dirname(full));
  await writeFile(full, data);
  return normalized;
}

export async function readStorageFile(stored: string): Promise<Buffer | null> {
  try {
    if (isRemoteUrl(stored)) {
      const res = await fetch(stored);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }

    return await readFile(storagePath(toRelPath(stored)));
  } catch {
    return null;
  }
}

export async function deleteStorageFile(stored: string) {
  try {
    if (isRemoteUrl(stored)) {
      const { del } = await import("@vercel/blob");
      await del(stored);
      return;
    }

    await unlink(storagePath(toRelPath(stored)));
  } catch {
    // ignore missing files
  }
}

export function publicFileUrl(stored: string): string {
  if (isRemoteUrl(stored)) return stored;
  return `/api/files/${normalizeRelPath(stored)}`;
}

export function versionedPublicUrl(stored: string, version: Date | number | string): string {
  const base = publicFileUrl(stored);
  const v = version instanceof Date ? version.getTime() : String(version);
  return `${base}?v=${v}`;
}
