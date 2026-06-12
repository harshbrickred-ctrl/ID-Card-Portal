const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.PORTAL_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("idportal-token");
}

export function setToken(token: string) {
  localStorage.setItem("idportal-token", token);
}

export function clearToken() {
  localStorage.removeItem("idportal-token");
}

export type UploadProgressPhase = "uploading" | "processing" | "done";

export function apiUploadFormData<T>(
  path: string,
  formData: FormData,
  onProgress?: (phase: UploadProgressPhase, percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress?.("uploading", percent);
      }
    });

    xhr.upload.addEventListener("loadend", () => {
      onProgress?.("processing", 100);
    });

    xhr.addEventListener("load", () => {
      try {
        const json = JSON.parse(xhr.responseText) as { success?: boolean; data?: T; error?: { message?: string | string[] } };
        if (xhr.status >= 200 && xhr.status < 300 && json.success !== false) {
          onProgress?.("done", 100);
          resolve(json.data as T);
          return;
        }
        const msg = json?.error?.message ?? xhr.statusText;
        reject(new ApiError(Array.isArray(msg) ? msg.join("; ") : String(msg), xhr.status));
      } catch {
        reject(new ApiError("Upload failed", xhr.status));
      }
    });

    xhr.addEventListener("error", () => reject(new ApiError("Network error during upload", 0)));
    xhr.addEventListener("abort", () => reject(new ApiError("Upload cancelled", 0)));
    xhr.send(formData);
  });
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    const msg = json?.error?.message ?? res.statusText;
    throw new ApiError(Array.isArray(msg) ? msg.join("; ") : String(msg), res.status);
  }
  return json.data as T;
}

export async function apiPostZip(path: string, body: unknown, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = json?.error?.message ?? "Print failed";
    throw new ApiError(Array.isArray(msg) ? msg.join("; ") : String(msg), res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function apiDownload(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError("Download failed", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
