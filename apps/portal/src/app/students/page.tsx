"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Upload, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Badge, GlassCard, PageHeader } from "@/components/ui";

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

const emptyStudent = {
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
  const [filters, setFilters] = useState({ enrollId: "", name: "", class: "", section: "" });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [photoZipFile, setPhotoZipFile] = useState<File | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const [photoZipMsg, setPhotoZipMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyStudent);
  const [showAdd, setShowAdd] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoVersions, setPhotoVersions] = useState<Record<string, number>>({});
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState("");

  const loadStudents = useCallback(async () => {
    if (!schoolId) return;
    const params = new URLSearchParams({ schoolId });
    if (filters.enrollId) params.set("enrollId", filters.enrollId);
    if (filters.name) params.set("name", filters.name);
    if (filters.class) params.set("class", filters.class);
    if (filters.section) params.set("section", filters.section);
    const data = await apiFetch<Student[]>(`/v1/students?${params}`);
    setStudents(data);
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

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const selectedSchool = schools.find((s) => s.id === schoolId);

  async function importExcel(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile || !schoolId) return;
    setImportMsg("");
    const fd = new FormData();
    fd.append("schoolId", schoolId);
    fd.append("file", importFile);
    try {
      const result = await apiFetch<{ imported: number; skipped: { row: number; reason: string }[] }>(
        "/v1/students/import",
        { method: "POST", body: fd },
      );
      setImportMsg(`Imported ${result.imported} students. Skipped ${result.skipped.length} rows.`);
      setImportFile(null);
      await loadStudents();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function importPhotoZip(e: React.FormEvent) {
    e.preventDefault();
    if (!photoZipFile || !schoolId) return;
    setPhotoZipMsg("");
    const fd = new FormData();
    fd.append("schoolId", schoolId);
    fd.append("file", photoZipFile);
    try {
      const result = await apiFetch<{ imported: number; skipped: { file: string; reason: string }[] }>(
        "/v1/students/photos/bulk",
        { method: "POST", body: fd },
      );
      setPhotoZipMsg(`Matched ${result.imported} photos. Skipped ${result.skipped.length} files.`);
      setPhotoZipFile(null);
      await loadStudents();
    } catch (err) {
      setPhotoZipMsg(err instanceof Error ? err.message : "Photo import failed");
    }
  }

  function resetPhotoState() {
    setPhotoFile(null);
    setEditPhotoUrl(null);
    setPhotoPreview(null);
    setPhotoMessage("");
  }

  function closeModal() {
    setShowAdd(false);
    setEditId(null);
    setForm(emptyStudent);
    resetPhotoState();
  }

  async function saveStudent(e: React.FormEvent) {
    e.preventDefault();
    try {
      let studentId = editId;
      if (editId) {
        await apiFetch(`/v1/students/${editId}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        const created = await apiFetch<Student>("/v1/students", {
          method: "POST",
          body: JSON.stringify({ ...form, schoolId }),
        });
        studentId = created.id;
      }
      if (photoFile && studentId) {
        await uploadPhoto(studentId, photoFile, { silent: true });
      }
      closeModal();
      await loadStudents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function deleteStudent(id: string) {
    if (!confirm("Delete this student?")) return;
    await apiFetch(`/v1/students/${id}`, { method: "DELETE" });
    await loadStudents();
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
      if (!options?.silent) setPhotoMessage("Photo uploaded successfully");
      await loadStudents();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Photo upload failed";
      if (options?.silent) throw err;
      setPhotoMessage(message);
      alert(message);
    } finally {
      setUploadingPhotoId(null);
      if (options?.input) options.input.value = "";
    }
  }

  function startEdit(s: Student) {
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
    setShowAdd(true);
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Import and manage student records per school"
        action={
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm(emptyStudent);
              resetPhotoState();
              setShowAdd(true);
            }}
            className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add Student
          </button>
        }
      />

      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">School</label>
            <select className="select-glass w-full" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          {selectedSchool ? <Badge color={selectedSchool.accentColor}>{selectedSchool.code}</Badge> : null}
        </div>

        <form onSubmit={importExcel} className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">Import from Excel</label>
            <input
              className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" disabled={!importFile} className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5">
            <Upload className="h-4 w-4" />
            Import
          </button>
        </form>
        {importMsg ? <p className="mt-2 text-sm text-success">{importMsg}</p> : null}
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          Excel columns: First Name, Last Name (or Name), Enroll ID, Class, Section, DOB, Phone, Address
        </p>
        <form onSubmit={importPhotoZip} className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/10 pt-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">Bulk photo import (ZIP)</label>
            <input
              className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setPhotoZipFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" disabled={!photoZipFile} className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5">
            <Upload className="h-4 w-4" />
            Import photos
          </button>
        </form>
        {photoZipMsg ? <p className="mt-2 text-sm text-success">{photoZipMsg}</p> : null}
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          ZIP files named <code>{`{enrollId}.jpg`}</code> or <code>.png</code> (e.g. DEMO-2026-001.jpg)
        </p>
      </GlassCard>

      <GlassCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input className="input-glass" placeholder="Filter by Enroll ID" value={filters.enrollId} onChange={(e) => setFilters({ ...filters, enrollId: e.target.value })} />
          <input className="input-glass" placeholder="Filter by Name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
          <input className="input-glass" placeholder="Filter by Class" value={filters.class} onChange={(e) => setFilters({ ...filters, class: e.target.value })} />
          <input className="input-glass" placeholder="Filter by Section" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })} />
        </div>
      </GlassCard>

      <GlassCard className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[var(--muted-foreground)]">
              <th className="pb-3 pr-4">Photo</th>
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Enroll ID</th>
              <th className="pb-3 pr-4">Class</th>
              <th className="pb-3 pr-4">Section</th>
              <th className="pb-3 pr-4">DOB</th>
              <th className="pb-3 pr-4">Phone Number</th>
              <th className="pb-3 pr-4">Address</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${s.photoUrl}${photoVersions[s.id] ? `?v=${photoVersions[s.id]}` : ""}`}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-[10px] text-[var(--muted-foreground)]">
                        No photo
                      </div>
                    )}
                    <label className="btn-ghost cursor-pointer rounded-lg px-2 py-1 text-xs">
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
                <td className="py-3 pr-4 font-medium">{s.name}</td>
                <td className="py-3 pr-4 font-mono text-xs">{s.enrollId}</td>
                <td className="py-3 pr-4">{s.class}</td>
                <td className="py-3 pr-4">{s.section}</td>
                <td className="py-3 pr-4 text-[var(--muted-foreground)]">{s.dob ?? "—"}</td>
                <td className="py-3 pr-4 text-[var(--muted-foreground)]">{s.phoneNumber ?? "—"}</td>
                <td className="max-w-[200px] truncate py-3 pr-4 text-[var(--muted-foreground)]" title={s.address ?? undefined}>
                  {s.address ?? "—"}
                </td>
                <td className="py-3">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => startEdit(s)} className="btn-ghost rounded-lg p-2">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {isSuperAdmin ? (
                      <button type="button" onClick={() => deleteStudent(s.id)} className="btn-ghost rounded-lg p-2 text-[var(--danger)]">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 ? (
          <p className="py-8 text-center text-[var(--muted-foreground)]">No students found</p>
        ) : null}
      </GlassCard>

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--persian-prince)]/80 p-4 backdrop-blur-md">
          <GlassCard elevated className="w-full max-w-lg">
            <h2 className="mb-4 text-lg font-semibold text-[var(--angora-goat)]">{editId ? "Edit Student" : "Add Student"}</h2>
            <form onSubmit={saveStudent} className="grid gap-3 sm:grid-cols-2">
              <input className="input-glass" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input-glass" placeholder="Enroll ID" value={form.enrollId} onChange={(e) => setForm({ ...form, enrollId: e.target.value })} required />
              <input className="input-glass" placeholder="Class" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} required />
              <input className="input-glass" placeholder="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required />
              <input className="input-glass" placeholder="DOB (e.g. 2010-05-12)" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              <input className="input-glass" placeholder="Phone Number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              <input className="input-glass sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">Student photo</label>
                <div className="flex items-center gap-3">
                  {photoPreview || editPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview ?? editPhotoUrl ?? ""}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/5 text-xs text-[var(--muted-foreground)]">
                      No photo
                    </div>
                  )}
                  <input
                    className="input-glass file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--vintage-grape)] file:px-3 file:py-1 file:text-sm file:text-[var(--angora-goat)]"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {editId ? "Choose a new image to replace the current photo when you save." : "Optional. You can also upload from the table after saving."}
                </p>
                {photoMessage ? <p className="mt-1 text-sm text-success">{photoMessage}</p> : null}
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className="btn-primary flex-1 rounded-xl py-2">Save</button>
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 rounded-xl py-2">Cancel</button>
              </div>
            </form>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}
