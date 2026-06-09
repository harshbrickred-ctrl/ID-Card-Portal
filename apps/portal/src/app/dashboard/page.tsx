"use client";

import { useEffect, useState } from "react";
import { Building2, CreditCard, Printer, Trash2, Users, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Badge, GlassCard, PageHeader, StatCard } from "@/components/ui";
import { palette, statAccents } from "@/lib/theme";

type DashboardData = {
  stats: {
    totalSchools: number;
    totalStudents: number;
    totalPrintJobs: number;
    totalCardsPrinted: number;
  };
  classBreakdown: { class: string; count: number }[];
  recentPrints: {
    id: string;
    cardCount: number;
    createdAt: string;
    school: { name: string; code: string; accentColor: string };
  }[];
  schools: {
    id: string;
    name: string;
    code: string;
    accentColor: string;
    studentCount: number;
    printJobCount: number;
    hasTemplate: boolean;
  }[];
};

export default function DashboardPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [data, setData] = useState<DashboardData | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", accentColor: palette.orchidHush });
  const [error, setError] = useState("");

  async function load() {
    const d = await apiFetch<DashboardData>("/v1/dashboard");
    setData(d);
  }

  useEffect(() => {
    void load();
  }, []);

  async function deleteSchool(id: string, name: string) {
    if (!confirm(`Delete school "${name}" and all its students, templates, and print history?`)) return;
    try {
      await apiFetch(`/v1/schools/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function addSchool(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/v1/schools", { method: "POST", body: JSON.stringify(form) });
      setShowAdd(false);
      setForm({ name: "", code: "", address: "", accentColor: palette.orchidHush });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add school");
    }
  }

  if (!data) {
    return <p className="text-[var(--muted-foreground)]">Loading dashboard…</p>;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of schools, students, and print activity"
        action={
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
            <Plus className="h-4 w-4" />
            Add School
          </button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Schools" value={data.stats.totalSchools} icon={Building2} accent={statAccents[0]} />
        <StatCard label="Total Students" value={data.stats.totalStudents} icon={Users} accent={statAccents[1]} />
        <StatCard label="Print Jobs" value={data.stats.totalPrintJobs} icon={Printer} accent={statAccents[2]} />
        <StatCard label="Cards Printed" value={data.stats.totalCardsPrinted} icon={CreditCard} accent={statAccents[3]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard tilt>
          <h2 className="mb-4 font-semibold text-[var(--angora-goat)]">Schools</h2>
          <div className="space-y-3">
            {data.schools.map((s) => (
              <div
                key={s.id}
                className="surface-row flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: s.accentColor, boxShadow: `0 0 12px ${s.accentColor}` }}
                  />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {s.studentCount} students · {s.printJobCount} print jobs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={s.accentColor}>{s.code}</Badge>
                  {s.hasTemplate ? (
                    <Badge variant="success">Template</Badge>
                  ) : (
                    <Badge variant="warning">No template</Badge>
                  )}
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => deleteSchool(s.id, s.name)}
                      className="btn-ghost rounded-lg p-2 text-[var(--danger)]"
                      title="Delete school"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard tilt>
          <h2 className="mb-4 font-semibold text-[var(--angora-goat)]">Students by Class</h2>
          <div className="space-y-2">
            {data.classBreakdown.map((c) => (
              <div key={c.class} className="flex items-center gap-3">
                <span className="w-16 text-sm text-[var(--muted-foreground)]">Class {c.class}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/25">
                  <div
                    className="progress-bar h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (c.count / Math.max(data.stats.totalStudents, 1)) * 100 * 3)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{c.count}</span>
              </div>
            ))}
          </div>

          <h2 className="mb-3 mt-6 font-semibold text-[var(--angora-goat)]">Recent Prints</h2>
          {data.recentPrints.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No print jobs yet</p>
          ) : (
            <div className="space-y-2">
              {data.recentPrints.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>
                    <Badge color={p.school.accentColor}>{p.school.code}</Badge>{" "}
                    <span className="ml-2">{p.cardCount} cards</span>
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--persian-prince)]/80 p-4 backdrop-blur-md">
          <GlassCard elevated className="w-full max-w-md">
            <h2 className="mb-4 text-lg font-semibold text-[var(--angora-goat)]">Add School</h2>
            {error ? <p className="mb-3 text-sm text-[var(--danger)]">{error}</p> : null}
            <form onSubmit={addSchool} className="space-y-3">
              <input className="input-glass" placeholder="School name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input-glass" placeholder="Code (e.g. GVPS)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
              <input className="input-glass" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input className="input-glass" type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 rounded-xl py-2">Create</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1 rounded-xl py-2">Cancel</button>
              </div>
            </form>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
