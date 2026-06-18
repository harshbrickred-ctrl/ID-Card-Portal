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
  hasLayout?: boolean;
  school: School;
  updatedAt: string;
};

export default function TemplatesPage() {
  const isAdmin = useAuthStore((s) => Boolean(s.user));
  const [schools, setSchools] = useState<School[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [layoutFile, setLayoutFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    phase: UploadProgressPhase;
    percent: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loadError, setLoadError] = useState("");

  const isPdfUpload = file?.name.toLowerCase().endsWith(".pdf") ?? false;

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
    setLoading(true);
    setUploadProgress({ phase: "uploading", percent: 0 });
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("schoolId", schoolId);
      fd.append("name", name || "School ID Template");
      fd.append("file", file);
      if (signature) fd.append("signature", signature);
      if (layoutFile) fd.append("layout", layoutFile);
      const result = await apiUploadFormData<{ layoutWarning?: string | null }>("/v1/templates", fd, (phase, percent) => {
        setUploadProgress({ phase, percent });
      });
      setMessageType("success");
      setMessage(
        result.layoutWarning
          ? `Template uploaded. Warning: ${result.layoutWarning}`
          : "Template and field layout uploaded. Cards will align to your design.",
      );
      setFile(null);
      setSignature(null);
      setLayoutFile(null);
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
      : uploadProgress?.phase === "processing" && isPdfUpload
        ? "Converting PDF to print-ready image…"
        : uploadProgress?.phase === "processing"
          ? "Processing template…"
          : "Finishing up…";

  const progressHint =
    uploadProgress?.phase === "processing" && isPdfUpload
      ? "Rendering page 1 at CR-80 size (1011×638 px). Please keep this tab open."
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
                ID card template (PDF recommended)
              </label>
              <input
                className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                PDF is converted automatically on the server — no CorelDRAW required. PNG and JPG also work.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
                Field layout JSON (recommended for custom designs)
              </label>
              <input
                className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                type="file"
                accept=".json,application/json"
                onChange={(e) => setLayoutFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                Upload <code className="text-[var(--angora-goat)]">sample-template.layout.json</code> so name, ID, and address align with your artwork.
              </p>
            </div>
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
              <p className="mb-2 font-medium text-[var(--angora-goat)]">Exporting from CorelDRAW</p>
              <ul className="space-y-1">
                <li>• Set page size to <strong>85.6×53.98 mm</strong> (CR-80 card).</li>
                <li>• File → Publish to PDF → <strong>300 DPI</strong>, or Export → PDF.</li>
                <li>• Upload the <strong>.pdf</strong> here — the portal renders it at 1011×638 px for printing.</li>
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
                        {t.hasLayout ? (
                          <span className="text-xs text-success">Field layout configured</span>
                        ) : (
                          <span className="text-xs text-warning">No field layout — may misalign</span>
                        )}
                        {t.signatureUrl ? (
                          <span className="text-xs text-success">Signature attached</span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">No signature</span>
                        )}
                      </div>
                    </div>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => removeTemplate(t.id, t.name)}
                        className="btn-ghost flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-[var(--danger)]"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
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
