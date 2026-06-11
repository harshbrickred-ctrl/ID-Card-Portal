"use client";

import { useEffect, useState } from "react";
import { Upload, FileImage, Trash2, PenLine } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
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
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const isCdrUpload = file?.name.toLowerCase().endsWith(".cdr") ?? false;
  const [loadError, setLoadError] = useState("");

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
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("schoolId", schoolId);
      fd.append("name", name || "School ID Template");
      fd.append("file", file);
      if (previewFile) fd.append("preview", previewFile);
      if (signature) fd.append("signature", signature);
      await apiFetch("/v1/templates", { method: "POST", body: fd });
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
    }
  }

  return (
    <div>
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
                <p className="mb-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-[var(--muted-foreground)]">
                  <strong className="text-[var(--angora-goat)]">CDR auto-conversion:</strong> we convert your .cdr to PNG
                  automatically using CorelDRAW (Windows), Inkscape, or cloud conversion. Conversion may take up to a
                  minute.
                </p>
                <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
                  Optional fallback — PNG or PDF export (only if auto-conversion fails)
                </label>
                <input
                  className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
                />
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
                <li>• <strong>.cdr</strong> — auto-converted to PNG (CorelDRAW on Windows, Inkscape, or cloud API).</li>
                <li>• <strong>.pdf / .png / .jpg</strong> — single-file upload works directly.</li>
                <li>• Principal signature is uploaded separately and stays the same on every card.</li>
                <li>• Per student: photo, name, enroll ID, class/section, phone, address are filled automatically.</li>
              </ul>
            </div>
            {message ? (
              <p className={`text-sm ${messageType === "error" ? "text-[var(--danger)]" : "text-success"}`}>{message}</p>
            ) : null}
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl py-2.5">
              {loading ? (isCdrUpload ? "Converting CDR…" : "Uploading…") : "Save Template"}
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
