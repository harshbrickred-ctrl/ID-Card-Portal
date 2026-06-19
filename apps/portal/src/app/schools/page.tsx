"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Filter, Plus, Search, Users } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { SchoolDetailDrawer, SchoolsCrudTable, type SchoolRecord } from "@/components/schools/SchoolsCrudTable";
import { SchoolFormModal, type SchoolFormValues } from "@/components/schools/SchoolFormModal";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "@/components/schools/schools.module.css";

type ApiSchool = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  accentColor: string;
  academicYear: string | null;
  logoUrl: string | null;
  createdAt: string;
  template: { id: string; name: string } | null;
  _count: { students: number; printJobs: number };
};

function mapSchool(row: ApiSchool): SchoolRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    accentColor: row.accentColor,
    academicYear: row.academicYear,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt,
    studentCount: row._count.students,
    printJobCount: row._count.printJobs,
    hasTemplate: !!row.template,
    templateName: row.template?.name ?? null,
  };
}

export default function SchoolsPage() {
  const router = useRouter();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<Partial<SchoolFormValues>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewSchool, setViewSchool] = useState<SchoolRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiFetch<ApiSchool[]>("/v1/schools");
      setSchools(rows.map(mapSchool));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    setFormMode("create");
    setEditingId(null);
    setFormInitial({});
    setFormError("");
    setFormOpen(true);
    router.replace("/schools");
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.address?.toLowerCase().includes(q) ?? false),
    );
  }, [schools, query]);

  const totals = useMemo(
    () => ({
      schools: schools.length,
      students: schools.reduce((sum, s) => sum + s.studentCount, 0),
      templates: schools.filter((s) => s.hasTemplate).length,
    }),
    [schools],
  );

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setFormInitial({});
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(school: SchoolRecord) {
    setViewSchool(null);
    setFormMode("edit");
    setEditingId(school.id);
    setFormInitial({
      name: school.name,
      code: school.code,
      address: school.address ?? "",
      accentColor: school.accentColor,
      academicYear: school.academicYear ?? "2025-26",
    });
    setFormError("");
    setFormOpen(true);
  }

  async function saveSchool(values: SchoolFormValues) {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: values.name,
        code: values.code,
        address: values.address || undefined,
        accentColor: values.accentColor,
        academicYear: values.academicYear || undefined,
      };
      if (formMode === "create") {
        await apiFetch("/v1/schools", { method: "POST", body: JSON.stringify(payload) });
        setBanner({ type: "success", text: `${values.name} created successfully.` });
      } else if (editingId) {
        await apiFetch(`/v1/schools/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setBanner({ type: "success", text: `${values.name} updated successfully.` });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/v1/schools/${deleteTarget.id}`, { method: "DELETE" });
      setBanner({ type: "success", text: `${deleteTarget.name} deleted.` });
      setDeleteTarget(null);
      setViewSchool(null);
      await load();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setDeleting(false);
    }
  }

  if (loading && schools.length === 0) {
    return <div className={dash.loading}>Loading schools…</div>;
  }

  return (
    <div className={dash.root}>
      <div className={dash.pageInner}>
        <header className={dash.header}>
          <div>
            <h1 className={dash.headerTitle}>Schools</h1>
            <p className={dash.headerDesc}>Manage school profiles, branding, and print setup</p>
          </div>
          <div className={dash.headerActions}>
            <div className={dash.searchWrap}>
              <Search className={dash.searchIcon} />
              <input
                className={dash.searchInput}
                placeholder="Search schools…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button type="button" className={dash.iconBtn} aria-label="Filter">
              <Filter className="h-4 w-4" />
            </button>
            <button type="button" className={dash.primaryBtn} onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New School
            </button>
          </div>
        </header>

        {banner ? (
          <p className={`${styles.banner} ${banner.type === "success" ? styles.bannerSuccess : styles.bannerError}`}>
            {banner.text}
          </p>
        ) : null}

        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <div className={styles.statPillIcon}>
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{totals.schools}</p>
              <p className={styles.statPillLabel}>Schools onboarded</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.statPillIcon}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{totals.students}</p>
              <p className={styles.statPillLabel}>Total students</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.statPillIcon}>
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{totals.templates}</p>
              <p className={styles.statPillLabel}>Templates ready</p>
            </div>
          </div>
        </div>

        <SchoolsCrudTable
          schools={filtered}
          isSuperAdmin={isSuperAdmin}
          onView={setViewSchool}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </div>

      <SchoolFormModal
        open={formOpen}
        mode={formMode}
        initial={formInitial}
        saving={saving}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={saveSchool}
      />

      <SchoolDetailDrawer
        school={viewSchool}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setViewSchool(null)}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      {deleteTarget ? (
        <div className={dash.modalBackdrop} onClick={() => setDeleteTarget(null)}>
          <div className={dash.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className={dash.modalTitle}>Delete {deleteTarget.name}?</h2>
            <p className="mt-2 text-sm text-[#64748b]">
              This removes the school, all students, templates, and print history. This action cannot be undone.
            </p>
            {!isSuperAdmin ? (
              <p className={`${styles.banner} ${styles.bannerError} mt-3`}>Only Super Admin can delete schools.</p>
            ) : null}
            <div className={`${dash.modalActions} mt-4`}>
              <button type="button" className={dash.modalCancel} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={dash.modalSubmit}
                style={{ background: "#dc2626" }}
                disabled={!isSuperAdmin || deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Deleting…" : "Delete school"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
