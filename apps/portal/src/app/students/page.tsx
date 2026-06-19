"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  FileSpreadsheet,
  Images,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { formatClassSection } from "@/lib/class-section";
import { useAuthStore } from "@/lib/auth-store";
import dash from "@/components/dashboard/dashboard.module.css";
import {
  ClassSectionsPanel,
  type ClassSectionRow,
} from "@/components/students/ClassSectionsPanel";
import { StudentFormModal, type StudentFormValues } from "@/components/students/StudentFormModal";
import styles from "@/components/students/students.module.css";

type School = { id: string; name: string; code: string; accentColor: string };
type Student = {
  id: string;
  enrollId: string;
  name: string;
  class: string;
  section: string;
  dob: string | null;
  phoneNumber: string | null;
  address: string | null;
  photoUrl: string | null;
};

const emptyStudent: StudentFormValues = {
  enrollId: "",
  name: "",
  class: "",
  section: "",
  dob: "",
  phoneNumber: "",
  address: "",
};

export default function StudentsPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classSections, setClassSections] = useState<ClassSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ enrollId: "", name: "", class: "", section: "" });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [photoZipFile, setPhotoZipFile] = useState<File | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormValues>(emptyStudent);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoVersions, setPhotoVersions] = useState<Record<string, number>>({});
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId });
      if (filters.enrollId) params.set("enrollId", filters.enrollId);
      if (filters.name) params.set("name", filters.name);
      if (filters.class) params.set("class", filters.class);
      if (filters.section) params.set("section", filters.section);
      const data = await apiFetch<Student[]>(`/v1/students?${params}`);
      setStudents(data);
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters]);

  const loadClassSections = useCallback(async () => {
    if (!schoolId) {
      setClassSections([]);
      return;
    }
    try {
      const rows = await apiFetch<ClassSectionRow[]>(
        `/v1/students/class-sections?schoolId=${encodeURIComponent(schoolId)}`,
      );
      setClassSections(rows);
    } catch {
      setClassSections([]);
    }
  }, [schoolId]);

  useEffect(() => {
    apiFetch<School[]>("/v1/schools").then((rows) => {
      setSchools(rows);
      const fromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("schoolId")
          : null;
      const match = fromUrl ? rows.find((s) => s.id === fromUrl) : null;
      setSchoolId(match?.id ?? rows[0]?.id ?? "");
    });
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    void loadClassSections();
  }, [loadClassSections]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (!openMenu) return;
    function close() {
      setOpenMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenu]);

  const selectedSchool = schools.find((s) => s.id === schoolId);

  const stats = useMemo(() => {
    const withPhoto = students.filter((s) => s.photoUrl).length;
    const schoolTotal = classSections.reduce((sum, row) => sum + row.count, 0);
    return {
      total: students.length,
      withPhoto,
      classSections: classSections.length,
      schoolTotal,
    };
  }, [students, classSections]);

  function selectClassSection(row: ClassSectionRow | null) {
    setFilters((prev) => ({
      ...prev,
      class: row?.class ?? "",
      section: row?.section ?? "",
    }));
  }

  async function refreshRoster() {
    await Promise.all([loadStudents(), loadClassSections()]);
  }

  function resetPhotoState() {
    setPhotoFile(null);
    setEditPhotoUrl(null);
    setPhotoPreview(null);
    setPhotoMessage("");
  }

  function closeModal() {
    setFormOpen(false);
    setEditId(null);
    setForm(emptyStudent);
    setFormError("");
    resetPhotoState();
  }

  function openCreate() {
    setFormMode("create");
    setEditId(null);
    setForm(emptyStudent);
    setFormError("");
    resetPhotoState();
    setFormOpen(true);
  }

  function startEdit(s: Student) {
    setOpenMenu(null);
    setFormMode("edit");
    setEditId(s.id);
    setForm({
      enrollId: s.enrollId,
      name: s.name,
      class: s.class,
      section: s.section,
      dob: s.dob ?? "",
      phoneNumber: s.phoneNumber ?? "",
      address: s.address ?? "",
    });
    setEditPhotoUrl(s.photoUrl);
    setPhotoFile(null);
    setPhotoMessage("");
    setFormError("");
    setFormOpen(true);
  }

  async function importExcel(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile || !schoolId) return;
    setImporting(true);
    setBanner(null);
    try {
      const fd = new FormData();
      fd.append("schoolId", schoolId);
      fd.append("file", importFile);
      const result = await apiFetch<{ imported: number; skipped: { row: number; reason: string }[] }>(
        "/v1/students/import",
        { method: "POST", body: fd },
      );
      const skipSample = result.skipped
        .slice(0, 3)
        .map((s) => `row ${s.row}: ${s.reason}`)
        .join("; ");
      if (result.imported === 0) {
        setBanner({
          type: "error",
          text: result.skipped.length
            ? `No students imported. ${skipSample}${result.skipped.length > 3 ? "…" : ""} Check column headers: Enroll ID, Name, Class, Section.`
            : "No students found in the file.",
        });
      } else {
        setBanner({
          type: result.skipped.length ? "error" : "success",
          text:
            result.skipped.length > 0
              ? `Imported ${result.imported} students. Skipped ${result.skipped.length} rows.${skipSample ? ` ${skipSample}` : ""}`
              : `Imported ${result.imported} students.`,
        });
      }
      setImportFile(null);
      await refreshRoster();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
    }
  }

  async function importPhotoZip(e: React.FormEvent) {
    e.preventDefault();
    if (!photoZipFile || !schoolId) return;
    try {
      const fd = new FormData();
      fd.append("schoolId", schoolId);
      fd.append("file", photoZipFile);
      const result = await apiFetch<{ imported: number; skipped: { file: string; reason: string }[] }>(
        "/v1/students/photos/bulk",
        { method: "POST", body: fd },
      );
      setBanner({
        type: "success",
        text: `Matched ${result.imported} photos. Skipped ${result.skipped.length} files.`,
      });
      setPhotoZipFile(null);
      await refreshRoster();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Photo import failed" });
    }
  }

  async function saveStudent(values: StudentFormValues) {
    setSaving(true);
    setFormError("");
    try {
      let studentId = editId;
      if (editId) {
        await apiFetch(`/v1/students/${editId}`, { method: "PATCH", body: JSON.stringify(values) });
      } else {
        const created = await apiFetch<Student>("/v1/students", {
          method: "POST",
          body: JSON.stringify({ ...values, schoolId }),
        });
        studentId = created.id;
      }
      if (photoFile && studentId) {
        await uploadPhoto(studentId, photoFile, { silent: true });
      }
      setBanner({
        type: "success",
        text: editId ? `${values.name} updated.` : `${values.name} added.`,
      });
      closeModal();
      await refreshRoster();
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
      await apiFetch(`/v1/students/${deleteTarget.id}`, { method: "DELETE" });
      setBanner({ type: "success", text: `${deleteTarget.name} deleted.` });
      setDeleteTarget(null);
      await refreshRoster();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setDeleting(false);
    }
  }

  async function uploadPhoto(
    studentId: string,
    file: File,
    options?: { input?: HTMLInputElement | null; silent?: boolean },
  ) {
    setUploadingPhotoId(studentId);
    if (!options?.silent) setPhotoMessage("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      await apiFetch(`/v1/students/${studentId}/photo`, { method: "POST", body: fd });
      setPhotoVersions((prev) => ({ ...prev, [studentId]: Date.now() }));
      if (!options?.silent) {
        setBanner({ type: "success", text: "Photo uploaded." });
      }
      await refreshRoster();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Photo upload failed";
      if (options?.silent) throw err;
      setBanner({ type: "error", text: message });
    } finally {
      setUploadingPhotoId(null);
      if (options?.input) options.input.value = "";
    }
  }

  return (
    <div className={dash.root}>
      <div className={dash.pageInner}>
        <header className={dash.header}>
          <div>
            <h1 className={dash.headerTitle}>Students</h1>
            <p className={dash.headerDesc}>Import, filter, and manage student records per school</p>
          </div>
          <div className={dash.headerActions}>
            <button type="button" className={dash.primaryBtn} onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              Add Student
            </button>
          </div>
        </header>

        <div className={styles.toolbarRow}>
          <div className={styles.schoolSelectWrap}>
            <label className={styles.formLabel} htmlFor="student-school">
              School
            </label>
            <select
              id="student-school"
              className={styles.formSelect}
              value={schoolId}
              onChange={(e) => {
                setSchoolId(e.target.value);
                setFilters({ enrollId: "", name: "", class: "", section: "" });
              }}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.toolbarAside}>
            {selectedSchool ? (
              <span className={styles.schoolBadge} style={{ background: selectedSchool.accentColor }}>
                {selectedSchool.code}
              </span>
            ) : null}
            <Link href="/schools" className={dash.linkBtn}>
              Manage schools
            </Link>
          </div>
        </div>

        {banner ? (
          <p className={`${styles.banner} ${banner.type === "success" ? styles.bannerSuccess : styles.bannerError}`}>
            {banner.text}
          </p>
        ) : null}

        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <div className={`${styles.statPillIcon} ${styles.statPillIconTeal}`}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.total}</p>
              <p className={styles.statPillLabel}>Students in view</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.statPillIcon}>
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.withPhoto}</p>
              <p className={styles.statPillLabel}>With photos</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={`${styles.statPillIcon} ${styles.statPillIconPurple}`}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.classSections}</p>
              <p className={styles.statPillLabel}>Class–sections</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={`${styles.statPillIcon} ${styles.statPillIconPurple}`}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.schoolTotal}</p>
              <p className={styles.statPillLabel}>Students in school</p>
            </div>
          </div>
        </div>

        {schoolId ? (
          <ClassSectionsPanel
            rows={classSections}
            activeClass={filters.class}
            activeSection={filters.section}
            onSelect={selectClassSection}
          />
        ) : null}

        <div className={styles.importGrid}>
          <div className={styles.importCard}>
            <p className={styles.importTitle}>
              <FileSpreadsheet className="h-4 w-4 text-[#0d9488]" />
              Import from Excel
            </p>
            <p className={styles.importHint}>
              Required columns: Enroll ID (or Admission No / Roll No), Name, Class, Section. A title row
              above the headers is fine. Class–Section combined (e.g. 10-A) also works.
            </p>
            <form onSubmit={importExcel} className={styles.importRow}>
              <input
                className={`${styles.formInput} ${styles.fileInput}`}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <button type="submit" disabled={importing || !importFile || !schoolId} className={styles.importBtn}>
                <Upload className="h-4 w-4" />
                {importing ? "Importing…" : "Import"}
              </button>
            </form>
          </div>
          <div className={styles.importCard}>
            <p className={styles.importTitle}>
              <Images className="h-4 w-4 text-[#0d9488]" />
              Bulk photo ZIP
            </p>
            <p className={styles.importHint}>
              Name files <code>{`{enrollId}.jpg`}</code> or <code>.png</code> inside the ZIP
            </p>
            <form onSubmit={importPhotoZip} className={styles.importRow}>
              <input
                className={`${styles.formInput} ${styles.fileInput}`}
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setPhotoZipFile(e.target.files?.[0] ?? null)}
              />
              <button type="submit" disabled={!photoZipFile || !schoolId} className={styles.importBtn}>
                <Upload className="h-4 w-4" />
                Import photos
              </button>
            </form>
          </div>
        </div>

        <section className={dash.panel}>
          <div className={dash.panelHeader}>
            <h2 className={dash.panelTitle}>Student roster</h2>
            <p className="text-sm text-[#64748b]">{students.length} shown</p>
          </div>

          <div className="border-b border-[#e2e8f0] px-6 py-4">
            <div className={styles.filterGrid}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  className={`${styles.formInput} pl-9`}
                  placeholder="Enroll ID"
                  value={filters.enrollId}
                  onChange={(e) => setFilters({ ...filters, enrollId: e.target.value })}
                />
              </div>
              <input
                className={styles.formInput}
                placeholder="Name"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              />
              <input
                className={styles.formInput}
                placeholder="Class"
                value={filters.class}
                onChange={(e) => setFilters({ ...filters, class: e.target.value })}
              />
              <input
                className={styles.formInput}
                placeholder="Section"
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
              />
            </div>
          </div>

          <div className={dash.tableWrap}>
            <table className={dash.table}>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th className={dash.colNum}>Enroll ID</th>
                  <th className={dash.colNum}>Class–Section</th>
                  <th>DOB</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th className={dash.colActions} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className={styles.photoCell}>
                        {s.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${s.photoUrl}${photoVersions[s.id] ? `?v=${photoVersions[s.id]}` : ""}`}
                            alt=""
                            className={styles.photoThumb}
                          />
                        ) : (
                          <div className={styles.photoPlaceholder}>No photo</div>
                        )}
                        <label className={styles.uploadLink}>
                          {uploadingPhotoId === s.id ? "Uploading…" : s.photoUrl ? "Replace" : "Upload"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingPhotoId === s.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void uploadPhoto(s.id, file, { input: e.target });
                            }}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="font-medium">{s.name}</td>
                    <td className={`${dash.colNum} font-mono text-xs`}>{s.enrollId}</td>
                    <td className={`${dash.colNum} font-medium`}>
                      {formatClassSection(s.class, s.section)}
                    </td>
                    <td className="text-[#64748b]">{s.dob ?? "—"}</td>
                    <td className="text-[#64748b]">{s.phoneNumber ?? "—"}</td>
                    <td className="max-w-[12rem] truncate text-[#64748b]" title={s.address ?? undefined}>
                      {s.address ?? "—"}
                    </td>
                    <td className={dash.colActions}>
                      <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={dash.menuBtn}
                          aria-label={`Actions for ${s.name}`}
                          onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenu === s.id ? (
                          <div className={styles.menuPanel}>
                            <button type="button" className={styles.menuItem} onClick={() => startEdit(s)}>
                              <Pencil className="h-4 w-4" />
                              Edit student
                            </button>
                            <Link href={`/print?schoolId=${schoolId}`} className={styles.menuItem}>
                              Print card
                            </Link>
                            {isSuperAdmin ? (
                              <button
                                type="button"
                                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                onClick={() => {
                                  setOpenMenu(null);
                                  setDeleteTarget(s);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? (
              <p className={dash.empty}>Loading students…</p>
            ) : students.length === 0 ? (
              <p className={dash.empty}>
                No students found. Import Excel or{" "}
                <button type="button" className={dash.linkBtn} onClick={openCreate}>
                  add one manually
                </button>
                .
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <StudentFormModal
        open={formOpen}
        mode={formMode}
        initial={form}
        photoPreview={photoPreview}
        existingPhotoUrl={editPhotoUrl}
        photoMessage={photoMessage}
        saving={saving}
        error={formError}
        onClose={closeModal}
        onSubmit={saveStudent}
        onPhotoChange={setPhotoFile}
      />

      {deleteTarget ? (
        <div className={dash.modalBackdrop} onClick={() => setDeleteTarget(null)}>
          <div className={dash.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className={dash.modalTitle}>Delete {deleteTarget.name}?</h2>
            <p className="mt-2 text-sm text-[#64748b]">This removes the student record and photo. Super Admin only.</p>
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
                {deleting ? "Deleting…" : "Delete student"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
