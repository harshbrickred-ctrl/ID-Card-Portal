"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Eye, Printer } from "lucide-react";
import { apiFetch, apiPostZip } from "@/lib/api/client";
import { Badge, GlassCard, PageHeader } from "@/components/ui";

type School = { id: string; name: string; code: string; accentColor: string };
type Student = {
  id: string;
  enrollId: string;
  name: string;
  class: string;
  section: string;
};
type PreviewItem = {
  studentId: string;
  enrollId: string;
  name: string;
  class: string;
  section: string;
  errors: string[];
  hasErrors: boolean;
  previewFront: string;
};
type PreviewResult = {
  school: School;
  hasTemplate: boolean;
  hasLayout?: boolean;
  previews: PreviewItem[];
  canPrint: boolean;
};

export default function PrintPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ enrollId: "", name: "", class: "", section: "" });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [step, setStep] = useState<"select" | "preview">("select");

  const loadStudents = useCallback(async () => {
    if (!schoolId) return;
    const params = new URLSearchParams({ schoolId });
    if (filters.enrollId) params.set("enrollId", filters.enrollId);
    if (filters.name) params.set("name", filters.name);
    if (filters.class) params.set("class", filters.class);
    if (filters.section) params.set("section", filters.section);
    const data = await apiFetch<Student[]>(`/v1/students?${params}`);
    setStudents(data);
    setSelected(new Set());
    setPreview(null);
    setStep("select");
  }, [schoolId, filters]);

  useEffect(() => {
    apiFetch<School[]>("/v1/schools").then((s) => {
      setSchools(s);
      if (s[0]) setSchoolId(s[0].id);
    });
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const selectedSchool = schools.find((s) => s.id === schoolId);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s.id)));
  }

  async function generatePreview() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const result = await apiFetch<PreviewResult>("/v1/print/preview", {
        method: "POST",
        body: JSON.stringify({ schoolId, studentIds: [...selected] }),
      });
      setPreview(result);
      setStep("preview");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function printAllFiltered() {
    if (students.length === 0) return;
    setLoading(true);
    try {
      const hasFilters = Object.values(filters).some(Boolean);
      const body = hasFilters
        ? { schoolId, filters }
        : { schoolId, studentIds: students.map((s) => s.id) };
      const result = await apiFetch<PreviewResult>("/v1/print/preview", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setPreview(result);
      setSelected(new Set(result.previews.map((p) => p.studentId)));
      setStep("preview");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function printCards() {
    if (!preview?.canPrint) return;
    const studentIds = preview.previews.map((p) => p.studentId);
    setPrinting(true);
    try {
      await apiPostZip(
        "/v1/print/execute",
        { schoolId, studentIds },
        `id-cards-${selectedSchool?.code ?? "school"}.zip`,
      );
      setStep("select");
      setPreview(null);
      setSelected(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Print failed");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Print ID Cards"
        description="Generate unlimited student ID cards from the school template — each card uses the same layout and signature"
      />

      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">School</label>
            <select className="select-glass w-full" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          {selectedSchool ? (
            <Badge color={selectedSchool.accentColor}>{selectedSchool.code}</Badge>
          ) : null}
          <p className="text-sm text-[var(--muted-foreground)]">
            {preview?.hasTemplate === false && step === "preview"
              ? "No custom template — using default card layout."
              : preview?.hasLayout === false && step === "preview"
                ? "Warning: template has no field layout — text may misalign on custom artwork."
                : "School template + layout + signature are applied to every card."}
          </p>
        </div>
      </GlassCard>

      {step === "select" ? (
        <>
          <GlassCard className="mb-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <input className="input-glass" placeholder="Enroll ID" value={filters.enrollId} onChange={(e) => setFilters({ ...filters, enrollId: e.target.value })} />
              <input className="input-glass" placeholder="Name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
              <input className="input-glass" placeholder="Class" value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })} />
              <input className="input-glass" placeholder="Section" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
            </div>
          </GlassCard>

          <GlassCard className="mb-6 overflow-x-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.size === students.length && students.length > 0} onChange={toggleAll} />
                Select all ({selected.size} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={students.length === 0 || loading}
                  onClick={printAllFiltered}
                  className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
                >
                  <Printer className="h-4 w-4" />
                  Preview all ({students.length})
                </button>
                <button
                  type="button"
                  disabled={selected.size === 0 || loading}
                  onClick={generatePreview}
                  className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
                >
                  <Eye className="h-4 w-4" />
                  {loading ? "Generating…" : "Preview selected"}
                </button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[var(--muted-foreground)]">
                  <th className="pb-3 pr-4 w-10" />
                  <th className="pb-3 pr-4">Enroll ID</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Class</th>
                  <th className="pb-3">Section</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-3 pr-4">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{s.enrollId}</td>
                    <td className="py-3 pr-4">{s.name}</td>
                    <td className="py-3 pr-4">{s.class}</td>
                    <td className="py-3">{s.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </>
      ) : preview ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep("select")} className="btn-ghost rounded-xl px-4 py-2 text-sm">
                ← Back to selection
              </button>
              {preview.canPrint ? (
                <span className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> Ready to print
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" /> Fix errors before printing
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={!preview.canPrint || printing}
              onClick={printCards}
              className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5"
            >
              <Printer className="h-4 w-4" />
              {printing ? "Building ZIP…" : `Print ${preview.previews.length} Cards`}
              <Download className="h-4 w-4" />
            </button>
          </div>
          {printing ? (
            <p className="mb-4 text-sm text-[var(--muted-foreground)]">
              Rendering front + back for each card and packaging the download. This usually takes a few seconds per card.
            </p>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {preview.previews.map((p) => (
              <GlassCard key={p.studentId} tilt className={p.hasErrors ? "border-[var(--cinema-screen)]/50" : ""}>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {p.enrollId} · Class {p.class}-{p.section}
                    </p>
                  </div>
                  {p.hasErrors ? (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                </div>

                <div className="card-3d overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--persian-prince)]/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewFront} alt={`Preview for ${p.name}`} className="w-full" />
                </div>

                {p.errors.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-warning">
                    {p.errors.map((e) => (
                      <li key={e}>• {e}</li>
                    ))}
                  </ul>
                ) : null}
              </GlassCard>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
