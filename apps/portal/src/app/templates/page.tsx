"use client";

import { useEffect, useState } from "react";
import { Upload, FileImage, Trash2, PenLine, Loader2 } from "lucide-react";
import { apiFetch, apiUploadFormData, type UploadProgressPhase } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Badge, GlassCard, PageHeader } from "@/components/ui";

type School = { id: string; name: string; code: string; accentColor: string };
type Template = {
  id: string;
  name: string;
  fileUrl: string;
  sourceUrl: string | null;
  sourceFormat: string | null;
  signatureUrl: string | null;
  school: School;
  updatedAt: string;
};

export default function TemplatesPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [schools, setSchools] = useState<School[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    phase: UploadProgressPhase;
    percent: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const isCdrUpload = file?.name.toLowerCase().endsWith(".cdr") ?? false;
  const [loadError, setLoadError] = useState("");
  const [cdrCaps, setCdrCaps] = useState<{
    cloudConvert: boolean;
    convertApi: boolean;
    cdrNeedsFallback: boolean;
    inkscapeFound: boolean;
    onVercel: boolean;
  } | null>(null);

  const cdrNeedsExportFile = isCdrUpload && (cdrCaps?.cdrNeedsFallback ?? false);

  async function load() {
    setLoadError("");
    const [schoolsResult, templatesResult] = await Promise.allSettled([
      apiFetch<School[]>("/v1/schools"),
      apiFetch<Template[]>("/v1/templates"),
    ]);

    let error = "";

    if (schoolsResult.status === "fulfilled") {
      setSchools(schoolsResult.value);
      if (!schoolId && schoolsResult.value[0]) setSchoolId(schoolsResult.value[0].id);
    } else {
      error =
        schoolsResult.reason instanceof Error ? schoolsResult.reason.message : "Failed to load schools";
    }

    if (templatesResult.status === "fulfilled") {
      setTemplates(templatesResult.value);
    } else if (!error) {
      error =
        templatesResult.reason instanceof Error ? templatesResult.reason.message : "Failed to load templates";
    }

    if (error) setLoadError(error);
  }

  useEffect(() => {
    void load();
    apiFetch<{
      cloudConvert: boolean;
      convertApi: boolean;
      cdrNeedsFallback: boolean;
      inkscapeFound: boolean;
      onVercel: boolean;
    }>("/v1/templates/capabilities")
      .then(setCdrCaps)
      .catch(() => null);
  }, []);

  async function removeTemplate(id: string, templateName: string) {
    if (!confirm(`Delete template "${templateName}"?`)) return;
    try {
      await apiFetch(`/v1/templates/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !schoolId) return;
    if (cdrNeedsExportFile && !previewFile) {
      setMessageType("error");
      setMessage(
        "Cloud hosting cannot convert CDR directly. Add a PNG or PDF export from CorelDRAW in the field below, or set CLOUDCONVERT_API_KEY in Vercel.",
      );
      return;
    }
    setLoading(true);
    setUploadProgress({ phase: "uploading", percent: 0 });
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("schoolId", schoolId);
      fd.append("name", name || "School ID Template");
      fd.append("file", file);
      if (previewFile) fd.append("preview", previewFile);
      if (signature) fd.append("signature", signature);
      await apiUploadFormData("/v1/templates", fd, (phase, percent) => {
        setUploadProgress({ phase, percent });
      });
      setMessageType("success");
      setMessage("Template uploaded. Preview is ready — you can now generate ID cards for all students.");
      setFile(null);
      setPreviewFile(null);
      setSignature(null);
      setName("");
      await load();
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  const progressLabel =
    uploadProgress?.phase === "uploading"
      ? `Uploading template… ${uploadProgress.percent}%`
      : uploadProgress?.phase === "processing" && isCdrUpload
        ? "Converting CDR to PNG…"
        : uploadProgress?.phase === "processing"
          ? "Processing template…"
          : "Finishing up…";

  const progressHint =
    uploadProgress?.phase === "processing" && isCdrUpload
      ? "Cloud conversion can take up to 2 minutes. Please keep this tab open."
      : uploadProgress?.phase === "uploading"
        ? "Sending your file to the server."
        : "Almost done.";

  return (
    <div>
      {uploadProgress ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1228] p-8 text-center shadow-2xl">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--orchid-hush)]" />
            <p className="text-lg font-semibold text-[var(--angora-goat)]">{progressLabel}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{progressHint}</p>
            {uploadProgress.phase === "uploading" ? (
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--orchid-hush)] transition-all duration-300"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            ) : (
              <div className="mt-5 flex justify-center gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-2 w-2 animate-pulse rounded-full bg-[var(--orchid-hush)]"
                    style={{ animationDelay: `${dot * 200}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PageHeader
        title="ID Card Templates"
        description="Upload the school card design once — student data is filled in automatically for every print"
      />

      {loadError ? (
        <GlassCard className="mb-6 border-[var(--danger)]/40">
          <p className="text-sm text-[var(--danger)]">{loadError}</p>
        </GlassCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard tilt>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--angora-goat)]">
            <Upload className="h-5 w-5 text-[var(--orchid-hush)]" />
            Upload School Template
          </h2>
          <form onSubmit={upload} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">School</label>
              <select className="select-glass w-full" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">Template name</label>
              <input className="input-glass" placeholder="e.g. 2025-26 Student ID Card" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
                ID card template (CDR, PDF, PNG, JPG)
              </label>
              <input
                className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                type="file"
                accept=".cdr,.pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  setFile(next);
                  if (!next?.name.toLowerCase().endsWith(".cdr")) setPreviewFile(null);
                }}
                required
              />
            </div>
            {isCdrUpload ? (
              <div>
                {cdrNeedsExportFile ? (
                  <p className="mb-2 rounded-xl border border-[var(--cinema-screen)]/40 bg-[var(--cinema-screen)]/10 p-3 text-xs text-[var(--angora-goat)]">
                    <strong>Required on cloud:</strong> Vercel cannot run CorelDRAW/Inkscape. Export your design from
                    CorelDRAW as PNG (1011×638 px) or PDF and attach it below. Your .cdr is still stored as the master
                    file. Or add <code className="text-[var(--orchid-hush)]">CLOUDCONVERT_API_KEY</code> in Vercel env vars
                    for automatic conversion.
                  </p>
                ) : (
                  <p className="mb-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[var(--muted-foreground)]">
                    <strong className="text-[var(--angora-goat)]">CDR auto-conversion:</strong> we try CloudConvert
                    (Vercel), CorelDRAW (Windows), or Inkscape. Conversion may take up to 2 minutes.
                    {cdrCaps?.cloudConvert ? " CloudConvert ready." : null}
                    {cdrCaps?.inkscapeFound ? " Inkscape detected." : null}
                    {cdrCaps?.convertApi && !cdrCaps.cloudConvert ? (
                      <span className="mt-1 block text-warning">
                        CONVERTAPI_SECRET does not support CDR — use CLOUDCONVERT_API_KEY on Vercel.
                      </span>
                    ) : null}
                  </p>
                )}
                <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
                  {cdrNeedsExportFile
                    ? "Print-ready PNG or PDF export from CorelDRAW (required)"
                    : "Optional fallback — PNG or PDF export (if auto-conversion fails)"}
                </label>
                <input
                  className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
                  required={cdrNeedsExportFile}
                />
                {cdrNeedsExportFile ? (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    In CorelDRAW: File → Export → PNG, or File → Publish to PDF.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                <PenLine className="h-4 w-4" />
                Principal signature (PNG/JPG, optional)
              </label>
              <input
                className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setSignature(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[var(--muted-foreground)]">
              <p className="mb-2 font-medium text-[var(--angora-goat)]">CorelDRAW / industry formats</p>
              <ul className="space-y-1">
                <li>• <strong>.cdr</strong> — auto-converted to PNG (CloudConvert on Vercel, Inkscape/CorelDRAW locally).</li>
                <li>• <strong>.pdf / .png / .jpg</strong> — single-file upload works directly.</li>
                <li>• Principal signature is uploaded separately and stays the same on every card.</li>
                <li>• Per student: photo, name, enroll ID, class/section, phone, address are filled automatically.</li>
              </ul>
            </div>
            {message ? (
              <p className={`text-sm ${messageType === "error" ? "text-[var(--danger)]" : "text-success"}`}>{message}</p>
            ) : null}
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl py-2.5">
              {loading ? "Working…" : "Save Template"}
            </button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--angora-goat)]">
            <FileImage className="h-5 w-5 text-[var(--endless-slumber)]" />
            School Templates
          </h2>
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No templates uploaded yet. Upload a template to start printing ID cards.</p>
          ) : (
            <div className="space-y-4">
              {templates.map((t) => (
                <div key={t.id} className="surface-row overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge color={t.school.accentColor}>{t.school.code}</Badge>
                        <span className="text-xs text-[var(--muted-foreground)]">{t.school.name}</span>
                        {t.sourceFormat ? (
                          <span className="text-xs text-[var(--muted-foreground)]">Source: {t.sourceFormat.toUpperCase()}</span>
                        ) : null}
                        {t.signatureUrl ? (
                          <span className="text-xs text-success">Signature attached</span>
                        ) : (
                          <span className="text-xs text-warning">No signature</span>
                        )}
                      </div>
                    </div>
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => removeTemplate(t.id, t.name)}
                        className="btn-ghost rounded-lg p-2 text-[var(--danger)]"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.fileUrl}
                    alt={t.name}
                    className="h-48 w-full object-contain bg-white/10 p-2"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {t.signatureUrl ? (
                    <div className="border-t border-white/10 p-3">
                      <p className="mb-2 text-xs text-[var(--muted-foreground)]">Principal signature</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.signatureUrl} alt="Principal signature" className="h-12 object-contain" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
