"use client";

import { useEffect, useState } from "react";
import { Upload, FileImage, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Badge, GlassCard, PageHeader } from "@/components/ui";

type School = { id: string; name: string; code: string; accentColor: string };
type Template = {
  id: string;
  name: string;
  fileUrl: string;
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [s, t] = await Promise.all([
      apiFetch<School[]>("/v1/schools"),
      apiFetch<Template[]>("/v1/templates"),
    ]);
    setSchools(s);
    setTemplates(t);
    if (!schoolId && s[0]) setSchoolId(s[0].id);
  }

  useEffect(() => {
    void load();
  }, []);

  async function removeTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
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
      await apiFetch("/v1/templates", { method: "POST", body: fd });
      setMessage("Template uploaded successfully");
      setFile(null);
      setName("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Upload a unique ID card background for each school"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard tilt>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--angora-goat)]">
            <Upload className="h-5 w-5 text-[var(--orchid-hush)]" />
            Upload Template
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
              <input className="input-glass" placeholder="e.g. 2024-25 Student Card" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">Template image (PNG/JPG)</label>
              <input
                className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              CR-80 card size recommended (1011×638 px). Student photo and details will be overlaid automatically.
            </p>
            {message ? <p className="text-sm text-success">{message}</p> : null}
            <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl py-2.5">
              {loading ? "Uploading…" : "Upload Template"}
            </button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-[var(--angora-goat)]">
            <FileImage className="h-5 w-5 text-[var(--endless-slumber)]" />
            School Templates
          </h2>
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No templates uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {templates.map((t) => (
                <div key={t.id} className="surface-row overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <div className="mt-1 flex gap-2">
                        <Badge color={t.school.accentColor}>{t.school.code}</Badge>
                        <span className="text-xs text-[var(--muted-foreground)]">{t.school.name}</span>
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
                  <img src={t.fileUrl} alt={t.name} className="h-40 w-full object-cover opacity-90" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
