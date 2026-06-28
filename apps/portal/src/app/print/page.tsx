"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useState } from "react";

import {

  AlertTriangle,

  CheckCircle2,

  Download,

  Eye,

  FileImage,

  Loader2,

  Printer,

  Search,

  Users,

} from "lucide-react";

import { apiFetch, apiPostDownload } from "@/lib/api/client";

import { CardPreviewModal } from "@/components/CardPreviewModal";

import dash from "@/components/dashboard/dashboard.module.css";

import styles from "@/components/print/print.module.css";



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

  previewBack: string;

};

type PreviewResult = {

  school: School;

  hasTemplate: boolean;

  hasLayout?: boolean;

  previews: PreviewItem[];

  canPrint: boolean;

};



type TemplateSummary = { id: string; schoolId: string; name: string; hasLayout: boolean };



export default function PrintPage() {

  const router = useRouter();

  const [schools, setSchools] = useState<School[]>([]);

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);

  const [schoolId, setSchoolId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState({ enrollId: "", name: "", class: "", section: "" });

  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const [loading, setLoading] = useState(false);

  const [printing, setPrinting] = useState(false);

  const [modalCard, setModalCard] = useState<PreviewItem | null>(null);
  const [modalSide, setModalSide] = useState<"front" | "back">("front");

  const [step, setStep] = useState<"select" | "preview">("select");

  const [banner, setBanner] = useState<string | null>(null);

  const [loadError, setLoadError] = useState("");



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

    setLoadError("");

    Promise.allSettled([

      apiFetch<School[]>("/v1/schools"),

      apiFetch<{ id: string; schoolId: string; name: string; hasLayout?: boolean }[]>("/v1/templates"),

    ]).then(([schoolsResult, templatesResult]) => {

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

        error =

          schoolsResult.reason instanceof Error

            ? schoolsResult.reason.message

            : "Failed to load schools";

      }



      if (templatesResult.status === "fulfilled") {
        setTemplates(
          templatesResult.value.map((row) => ({
            id: row.id,
            schoolId: row.schoolId,
            name: row.name,
            hasLayout: Boolean(row.hasLayout),
          })),
        );
      } else if (!error) {

        error =

          templatesResult.reason instanceof Error

            ? templatesResult.reason.message

            : "Failed to load templates";

      }



      if (error) setLoadError(error);

    });

  }, []);



  const schoolTemplate = templates.find((t) => t.schoolId === schoolId);



  useEffect(() => {

    void loadStudents().catch((err) => {

      setBanner(err instanceof Error ? err.message : "Failed to load students");

    });

  }, [loadStudents]);



  const selectedSchool = schools.find((s) => s.id === schoolId);



  const templateStatus = useMemo(() => {

    if (!schoolTemplate) {

      return {

        tone: "error" as const,

        text: "No template for this school yet.",

        link: `/templates?schoolId=${schoolId}`,

        linkLabel: "Upload template",

      };

    }

    if (!schoolTemplate.hasLayout) {
      return {
        tone: "warn" as const,
        text: `"${schoolTemplate.name}" is uploaded but field layout is not saved.`,
        link: `/templates/${schoolTemplate.id}/layout`,
        linkLabel: "Edit layout",
      };
    }

    return {

      tone: "ok" as const,

      text: `Using “${schoolTemplate.name}” with saved field layout and signature.`,

      link: null,

      linkLabel: null,

    };

  }, [schoolTemplate, schoolId]);



  const previewBlockers = useMemo(() => {
    if (!preview || preview.canPrint) return [];
    const msgs = new Set<string>();
    for (const p of preview.previews) {
      for (const e of p.errors) msgs.add(e);
    }
    return [...msgs];
  }, [preview]);



  function onSchoolChange(nextId: string) {

    setSchoolId(nextId);

    setBanner(null);

    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (nextId) params.set("schoolId", nextId);

    else params.delete("schoolId");

    const qs = params.toString();

    router.replace(qs ? `/print?${qs}` : "/print", { scroll: false });

  }



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

    setBanner(null);

    try {

      const result = await apiFetch<PreviewResult>("/v1/print/preview", {

        method: "POST",

        body: JSON.stringify({ schoolId, studentIds: [...selected] }),

      });

      setPreview(result);

      setStep("preview");

    } catch (err) {

      setBanner(err instanceof Error ? err.message : "Preview failed");

    } finally {

      setLoading(false);

    }

  }



  async function printAllFiltered() {

    if (students.length === 0) return;

    setLoading(true);

    setBanner(null);

    try {

      const result = await apiFetch<PreviewResult>("/v1/print/preview", {

        method: "POST",

        body: JSON.stringify({ schoolId, studentIds: students.map((s) => s.id) }),

      });

      setPreview(result);

      setSelected(new Set(result.previews.map((p) => p.studentId)));

      setStep("preview");

    } catch (err) {

      setBanner(err instanceof Error ? err.message : "Preview failed");

    } finally {

      setLoading(false);

    }

  }



  async function printCards() {

    if (!preview?.canPrint) return;

    const studentIds = preview.previews.map((p) => p.studentId);

    setPrinting(true);

    setBanner(null);

    try {

      await apiPostDownload(
        "/v1/print/execute",
        { schoolId, studentIds, format: "zip" },
        `id-cards-${selectedSchool?.code ?? "school"}`,
      );

      setStep("select");

      setPreview(null);

      setSelected(new Set());

    } catch (err) {

      setBanner(err instanceof Error ? err.message : "Print failed");

    } finally {

      setPrinting(false);

    }

  }



  const hasTemplate = Boolean(schoolTemplate);
  const hasLayoutReady = Boolean(schoolTemplate?.hasLayout);
  const canPreview = hasTemplate && hasLayoutReady && students.length > 0;



  return (

    <div className={dash.root}>

      {printing ? (

        <div className={styles.progressBackdrop} role="status" aria-live="polite" aria-busy="true">

          <div className={styles.progressDialog}>

            <Loader2 className="mx-auto h-11 w-11 animate-spin text-[#0d9488]" />

            <p className={styles.progressTitle}>Preparing download…</p>

            <p className={styles.progressHint}>

              Rendering front and back for each card. Keep this tab open.

            </p>

            <div className={styles.progressDots}>

              {[0, 1, 2].map((dot) => (

                <span key={dot} className={styles.progressDot} style={{ animationDelay: `${dot * 200}ms` }} />

              ))}

            </div>

          </div>

        </div>

      ) : null}



      <div className={dash.pageInner}>

        <header className={dash.header}>

          <div>

            <h1 className={dash.headerTitle}>Print ID Cards</h1>

            <p className={dash.headerDesc}>

              Select students, preview cards against the school template, then download PNG images (ZIP)

            </p>

          </div>

        </header>



        {loadError ? <p className={`${styles.banner} ${styles.bannerError}`}>{loadError}</p> : null}

        {banner ? <p className={`${styles.banner} ${styles.bannerError}`}>{banner}</p> : null}



        <div className={styles.toolbarRow}>

          <div className={styles.schoolSelectWrap}>

            <label className={styles.formLabel} htmlFor="print-school">

              School

            </label>

            <select

              id="print-school"

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

          <Link href={`/templates?schoolId=${schoolId}`} className={dash.linkBtn}>

            Manage template

          </Link>

          <Link href={`/students?schoolId=${schoolId}`} className={dash.linkBtn}>

            Manage students

          </Link>
          </div>

        </div>



        <p

          className={`${styles.statusBanner} ${

            templateStatus.tone === "ok"

              ? styles.statusOk

              : templateStatus.tone === "warn"

                ? styles.statusWarn

                : styles.statusError

          }`}

        >

          {templateStatus.text}{" "}

          {templateStatus.link ? (

            <Link href={templateStatus.link}>{templateStatus.linkLabel}</Link>

          ) : null}

        </p>



        <div className={styles.statsRow}>

          <div className={styles.statPill}>

            <div className={styles.statPillIcon}>

              <Users className="h-5 w-5" />

            </div>

            <div>

              <p className={styles.statPillValue}>{students.length}</p>

              <p className={styles.statPillLabel}>Students in view</p>

            </div>

          </div>

          <div className={styles.statPill}>

            <div className={`${styles.statPillIcon} ${styles.statPillIconBlue}`}>

              <Eye className="h-5 w-5" />

            </div>

            <div>

              <p className={styles.statPillValue}>{selected.size}</p>

              <p className={styles.statPillLabel}>Selected for preview</p>

            </div>

          </div>

          <div className={styles.statPill}>

            <div className={`${styles.statPillIcon} ${styles.statPillIconPurple}`}>

              <FileImage className="h-5 w-5" />

            </div>

            <div>

              <p className={styles.statPillValue}>{schoolTemplate?.hasLayout ? "Ready" : "Setup"}</p>

              <p className={styles.statPillLabel}>Template status</p>

            </div>

          </div>

        </div>



        {step === "select" ? (

          <section className={dash.panel}>

            <div className={dash.panelHeader}>

              <h2 className={dash.panelTitle}>Select students</h2>

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



            <div className={styles.panelToolbar}>

              <label className={styles.selectAll}>

                <input

                  type="checkbox"

                  checked={selected.size === students.length && students.length > 0}

                  onChange={toggleAll}

                />

                Select all ({selected.size} selected)

              </label>

              <div className={styles.actionRow}>

                <button

                  type="button"

                  disabled={students.length === 0 || loading || !canPreview}

                  title={
                    !hasTemplate
                      ? "Upload a template for this school first"
                      : !hasLayoutReady
                        ? "Save field layout in Templates → Edit layout before previewing"
                        : undefined
                  }

                  onClick={() => void printAllFiltered()}

                  className={styles.ghostBtn}

                >

                  <Printer className="h-4 w-4" />

                  Preview all ({students.length})

                </button>

                <button

                  type="button"

                  disabled={selected.size === 0 || loading || !canPreview}

                  title={
                    !hasTemplate
                      ? "Upload a template for this school first"
                      : !hasLayoutReady
                        ? "Save field layout in Templates → Edit layout before previewing"
                        : undefined
                  }

                  onClick={() => void generatePreview()}

                  className={dash.primaryBtn}

                >

                  <Eye className="h-4 w-4" />

                  {loading ? "Generating…" : "Preview selected"}

                </button>

              </div>

            </div>



            {students.length === 0 ? (

              <p className={styles.empty}>

                No students match these filters.{" "}

                <Link href={`/students?schoolId=${schoolId}`}>Import or add students</Link> first.

              </p>

            ) : (

              <div className={dash.tableWrap}>

                <table className={dash.table}>

                  <thead>

                    <tr>

                      <th className="w-10" aria-label="Select" />

                      <th className={dash.colNum}>Enroll ID</th>

                      <th>Name</th>

                      <th className={dash.colNum}>Class</th>

                      <th className={dash.colNum}>Section</th>

                    </tr>

                  </thead>

                  <tbody>

                    {students.map((s) => (

                      <tr key={s.id}>

                        <td>

                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />

                        </td>

                        <td className={`${dash.colNum} font-mono text-xs`}>{s.enrollId}</td>

                        <td className="font-medium">{s.name}</td>

                        <td className={dash.colNum}>{s.class}</td>

                        <td className={dash.colNum}>{s.section}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        ) : preview ? (

          <>

            <div className={styles.previewBar}>

              <div className={styles.previewStatus}>

                <button type="button" onClick={() => setStep("select")} className={styles.ghostBtn}>

                  ← Back to selection

                </button>

                {preview.canPrint ? (

                  <span className={styles.statusChipOk}>

                    <CheckCircle2 className="h-4 w-4" />

                    Ready to print

                  </span>

                ) : (

                  <span className={styles.statusChipWarn}>

                    <AlertTriangle className="h-4 w-4" />

                    Fix errors before printing

                  </span>

                )}

              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  disabled={!preview.canPrint || printing}
                  onClick={() => void printCards()}
                  className={dash.primaryBtn}
                >
                  <Printer className="h-4 w-4" />
                  {printing ? "Preparing download…" : `Download ${preview.previews.length} PNG images`}
                  <Download className="h-4 w-4" />
                </button>
              </div>

            </div>



            {!preview.canPrint && previewBlockers.length > 0 ? (
              <div className={`${styles.statusBanner} ${styles.statusWarn}`}>
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Printing is blocked until you fix:</p>
                <ul className={styles.errorList}>
                  {previewBlockers.map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
                {previewBlockers.some((e) => e.toLowerCase().includes("layout")) && schoolTemplate ? (
                  <Link href={`/templates/${schoolTemplate.id}/layout`} className={dash.linkBtn} style={{ marginTop: "0.75rem", display: "inline-flex" }}>
                    Open layout editor
                  </Link>
                ) : null}
              </div>
            ) : null}



            <div className={styles.previewGrid}>

              {preview.previews.map((p) => (

                <article

                  key={p.studentId}

                  className={`${styles.previewCard} ${p.hasErrors ? styles.previewCardError : ""}`}

                >

                  <div className={styles.previewCardHead}>

                    <div>

                      <p className={styles.previewCardName}>{p.name}</p>

                      <p className={styles.previewCardMeta}>

                        {p.enrollId} · Class {p.class}-{p.section}

                      </p>

                    </div>

                    {p.hasErrors ? (

                      <AlertTriangle className="h-5 w-5 text-[#d97706]" />

                    ) : (

                      <CheckCircle2 className="h-5 w-5 text-[#059669]" />

                    )}

                  </div>



                  <div className={styles.previewThumbGrid}>
                    <button
                      type="button"
                      className={styles.previewThumb}
                      onClick={() => {
                        setModalCard(p);
                        setModalSide("front");
                      }}
                      aria-label={`Enlarge front preview for ${p.name}`}
                    >
                      <span className={styles.previewSideLabel}>Front</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewFront} alt={`Front preview for ${p.name}`} className={styles.previewThumbImg} />
                    </button>
                    <button
                      type="button"
                      className={styles.previewThumb}
                      onClick={() => {
                        setModalCard(p);
                        setModalSide("back");
                      }}
                      aria-label={`Enlarge back preview for ${p.name}`}
                    >
                      <span className={styles.previewSideLabel}>Back</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewBack} alt={`Back preview for ${p.name}`} className={styles.previewThumbImg} />
                    </button>
                  </div>
                  <p className={styles.previewThumbHint}>Click front or back to inspect full size</p>



                  {p.errors.length > 0 ? (

                    <ul className={styles.errorList}>

                      {p.errors.map((e) => (

                        <li key={e}>• {e}</li>

                      ))}

                    </ul>

                  ) : null}

                </article>

              ))}

            </div>



            <CardPreviewModal
              open={modalCard != null}
              onClose={() => setModalCard(null)}
              title={modalCard?.name ?? ""}
              subtitle={
                modalCard ? `${modalCard.enrollId} · Class ${modalCard.class}-${modalCard.section}` : undefined
              }
              imageSrc={modalCard?.previewFront ?? ""}
              imageSrcBack={modalCard?.previewBack}
              imageAlt={modalCard ? `ID card for ${modalCard.name}` : undefined}
              errors={modalCard?.errors}
              initialSide={modalSide}
            />

          </>

        ) : null}

      </div>

    </div>

  );

}

