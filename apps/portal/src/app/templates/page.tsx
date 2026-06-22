"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FileImage,
  LayoutTemplate,
  Loader2,
  Move,
  PenLine,
  Trash2,
  Upload,
} from "lucide-react";
import { apiFetch, apiUploadFormData, type UploadProgressPhase } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "@/components/templates/templates.module.css";

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
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => Boolean(s.user));
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
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setSchoolId((current) => {
        if (current && schoolsResult.value.some((s) => s.id === current)) return current;
        const fromUrl =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("schoolId")
            : null;
        const match = fromUrl ? schoolsResult.value.find((s) => s.id === fromUrl) : null;
        return match?.id ?? schoolsResult.value[0]?.id ?? "";
      });
    } else {
      error = schoolsResult.reason instanceof Error ? schoolsResult.reason.message : "Failed to load schools";
    }

    if (templatesResult.status === "fulfilled") {
      setTemplates(templatesResult.value);
    } else if (!error) {
      error = templatesResult.reason instanceof Error ? templatesResult.reason.message : "Failed to load templates";
    }

    if (error) setLoadError(error);
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleTemplates = useMemo(
    () => (schoolId ? templates.filter((t) => t.school.id === schoolId) : templates),
    [templates, schoolId],
  );

  const stats = useMemo(
    () => ({
      total: visibleTemplates.length,
      withLayout: visibleTemplates.filter((t) => t.hasLayout).length,
      withSignature: visibleTemplates.filter((t) => t.signatureUrl).length,
    }),
    [visibleTemplates],
  );

  const selectedSchool = schools.find((s) => s.id === schoolId);

  function onSchoolChange(nextId: string) {
    setSchoolId(nextId);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (nextId) params.set("schoolId", nextId);
    else params.delete("schoolId");
    const qs = params.toString();
    router.replace(qs ? `/templates?${qs}` : "/templates", { scroll: false });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/v1/templates/${deleteTarget.id}`, { method: "DELETE" });
      setBanner({ type: "success", text: `Template "${deleteTarget.name}" deleted.` });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Delete failed" });
    } finally {
      setDeleting(false);
    }
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !schoolId) return;
    setLoading(true);
    setUploadProgress({ phase: "uploading", percent: 0 });
    setBanner(null);
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
      setBanner({
        type: result.layoutWarning ? "error" : "success",
        text: result.layoutWarning
          ? `Template uploaded with warning: ${result.layoutWarning}`
          : "Template uploaded. Open Edit layout to align fields on the card.",
      });
      setFile(null);
      setSignature(null);
      setLayoutFile(null);
      setName("");
      await load();
    } catch (err) {
      setBanner({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
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
      ? "Rendering page 1 at 300 DPI. Keep this tab open."
      : uploadProgress?.phase === "uploading"
        ? "Sending your file to the server."
        : "Almost done.";

  return (
    <div className={dash.root}>
      {uploadProgress ? (
        <div className={styles.progressBackdrop} role="status" aria-live="polite" aria-busy="true">
          <div className={styles.progressDialog}>
            <Loader2 className="mx-auto h-11 w-11 animate-spin text-[#0d9488]" />
            <p className={styles.progressTitle}>{progressLabel}</p>
            <p className={styles.progressHint}>{progressHint}</p>
            {uploadProgress.phase === "uploading" ? (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress.percent}%` }} />
              </div>
            ) : (
              <div className={styles.progressDots}>
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className={styles.progressDot} style={{ animationDelay: `${dot * 200}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className={dash.pageInner}>
        <header className={dash.header}>
          <div>
            <h1 className={dash.headerTitle}>Templates</h1>
            <p className={dash.headerDesc}>
              Upload each school&apos;s ID card design once — student data fills in automatically at print time
            </p>
          </div>
        </header>

        {loadError ? (
          <p className={`${styles.banner} ${styles.bannerError}`}>{loadError}</p>
        ) : null}
        {banner ? (
          <p className={`${styles.banner} ${banner.type === "success" ? styles.bannerSuccess : styles.bannerError}`}>
            {banner.text}
          </p>
        ) : null}

        <div className={styles.toolbarRow}>
          <div className={styles.schoolSelectWrap}>
            <label className={styles.formLabel} htmlFor="template-page-school">
              School
            </label>
            <select
              id="template-page-school"
              className={styles.formSelect}
              value={schoolId}
              onChange={(e) => onSchoolChange(e.target.value)}
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

        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <div className={styles.statPillIcon}>
              <FileImage className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.total}</p>
              <p className={styles.statPillLabel}>Templates for school</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={`${styles.statPillIcon} ${styles.statPillIconBlue}`}>
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.withLayout}</p>
              <p className={styles.statPillLabel}>With field layout</p>
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={`${styles.statPillIcon} ${styles.statPillIconPurple}`}>
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.statPillValue}>{stats.withSignature}</p>
              <p className={styles.statPillLabel}>With signature</p>
            </div>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <section className={styles.uploadPanel}>
            <h2 className={styles.uploadTitle}>
              <Upload className="h-5 w-5 text-[#0d9488]" />
              Upload template
            </h2>
            <form onSubmit={upload} className={styles.formStack}>
              {selectedSchool ? (
                <p className={styles.formHint}>
                  Uploading for{" "}
                  <span className={styles.schoolCode} style={{ background: selectedSchool.accentColor }}>
                    {selectedSchool.name} ({selectedSchool.code})
                  </span>
                </p>
              ) : null}
              <div>
                <label className={styles.formLabel} htmlFor="template-name">
                  Template name
                </label>
                <input
                  id="template-name"
                  className={styles.formInput}
                  placeholder="2025-26 Student ID Card"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className={styles.formLabel} htmlFor="template-file">
                  ID card file (PDF recommended)
                </label>
                <input
                  id="template-file"
                  className={`${styles.formInput} ${styles.fileInput}`}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
                <p className={styles.formHint}>
                  PDF page 1 is rasterized at 300 DPI at its native size. PNG and JPG keep their original dimensions.
                </p>
                {file ? <p className={styles.formHint}>Selected: {file.name}</p> : null}
              </div>
              <div>
                <label className={styles.formLabel} htmlFor="template-layout">
                  Layout JSON (optional)
                </label>
                <input
                  id="template-layout"
                  className={`${styles.formInput} ${styles.fileInput}`}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => setLayoutFile(e.target.files?.[0] ?? null)}
                />
                <p className={styles.formHint}>
                  Or use <strong>Edit layout</strong> after upload to drag fields into place — no JSON needed.
                </p>
              </div>
              <div>
                <label className={styles.formLabel} htmlFor="template-signature">
                  Principal signature (optional)
                </label>
                <input
                  id="template-signature"
                  className={`${styles.formInput} ${styles.fileInput}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setSignature(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className={styles.tipsBox}>
                <p className={styles.tipsTitle}>Exporting from CorelDRAW</p>
                <ul className="space-y-1">
                  <li>Any page size works — CR-80 (85.6×53.98 mm) is common but not required.</li>
                  <li>Export PDF at 300 DPI, then upload here.</li>
                  <li>Signature is reused on every card; student fields are filled at print.</li>
                </ul>
              </div>
              <button type="submit" disabled={loading || !file || !schoolId} className={styles.submitBtn}>
                {loading ? "Working…" : "Save template"}
              </button>
            </form>
          </section>

          <section className={styles.listPanel}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>School templates</h2>
              <p className="text-sm text-[#64748b]">
                {visibleTemplates.length} for {selectedSchool?.code ?? "school"}
              </p>
            </div>
            {visibleTemplates.length === 0 ? (
              <p className={styles.empty}>
                {selectedSchool
                  ? `No template for ${selectedSchool.name} yet. Upload a PDF or PNG on the left.`
                  : "Select a school, then upload a PDF or PNG to start printing ID cards."}
              </p>
            ) : (
              <div
                className={`${styles.templateGrid} ${
                  visibleTemplates.length === 2 ? styles.templateGridDouble : ""
                }`}
              >
                {visibleTemplates.map((t) => (
                  <article key={t.id} className={styles.templateCard}>
                    <div className={styles.templateCardHead}>
                      <p className={styles.templateName}>{t.name}</p>
                      <div className={styles.metaRow}>
                        <span className={styles.schoolCode} style={{ background: t.school.accentColor }}>
                          {t.school.code}
                        </span>
                        <span className={styles.metaText}>{t.school.name}</span>
                        {t.sourceFormat ? (
                          <span className={styles.metaText}>{t.sourceFormat.toUpperCase()}</span>
                        ) : null}
                        {t.hasLayout ? (
                          <span className={styles.statusOk}>Layout saved</span>
                        ) : (
                          <span className={styles.statusWarn}>Layout needed</span>
                        )}
                        <span className={styles.metaText}>
                          Updated {new Date(t.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.previewWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={t.updatedAt}
                        src={t.fileUrl}
                        alt={t.name}
                        className={styles.previewImg}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    {t.sourceUrl ? (
                      <p className={styles.sourcePdfRow}>
                        <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className={dash.linkBtn}>
                          Open uploaded PDF
                        </a>
                        <span className={styles.metaText}>Preview is converted from this file</span>
                      </p>
                    ) : null}
                    {t.signatureUrl ? (
                      <div className={styles.signatureRow}>
                        <p className={styles.signatureLabel}>Principal signature</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.signatureUrl} alt="Signature" className={styles.signatureImg} />
                      </div>
                    ) : null}
                    {isLoggedIn ? (
                      <div className={styles.cardFooter}>
                        <div className={styles.cardActions}>
                          <Link href={`/templates/${t.id}/layout`} className={styles.actionPrimary}>
                            <Move className="h-4 w-4" />
                            Edit layout
                          </Link>
                          <button
                            type="button"
                            className={`${styles.actionGhost} ${styles.actionDanger}`}
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {deleteTarget ? (
        <div className={dash.modalBackdrop} onClick={() => setDeleteTarget(null)}>
          <div className={dash.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className={dash.modalTitle}>Delete {deleteTarget.name}?</h2>
            <p className="mt-2 text-sm text-[#64748b]">
              Removes the template, layout, and signature for {deleteTarget.school.name}.
            </p>
            <div className={`${dash.modalActions} mt-4`}>
              <button type="button" className={dash.modalCancel} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={dash.modalSubmit}
                style={{ background: "#dc2626" }}
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting ? "Deleting…" : "Delete template"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
