"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Filter, MoreVertical, Trash2 } from "lucide-react";
import styles from "./dashboard.module.css";

type SchoolRow = {
  id: string;
  name: string;
  code: string;
  accentColor: string;
  logoUrl: string | null;
  studentCount: number;
  printJobCount: number;
  hasTemplate: boolean;
  hasLayout?: boolean;
  templateId?: string | null;
  templateName: string | null;
  printReady?: boolean;
  setupStatus?: "ready" | "needs_students" | "needs_template" | "needs_layout";
};

type SchoolsTableProps = {
  schools: SchoolRow[];
  isSuperAdmin?: boolean;
  readOnly?: boolean;
  onDelete?: (id: string, name: string) => void;
};

function initials(name: string, code: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return code.slice(0, 2).toUpperCase();
}

export function SchoolsTable({ schools, isSuperAdmin = false, readOnly = false, onDelete }: SchoolsTableProps) {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [schools, query]);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Schools</h2>
        {!readOnly ? (
          <div className={styles.panelToolbar}>
            <input
              className={styles.panelSearch}
              placeholder="Search schools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className={styles.filterBtn} aria-label="Filter schools">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link href="/schools" className={styles.linkBtn}>
            Manage schools
          </Link>
        )}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>School Name</th>
              <th className={styles.colNum}>Students</th>
              <th className={styles.colNum}>Print Jobs</th>
              <th className={styles.colNum}>Templates</th>
              <th className={styles.colStatus}>Status</th>
              {!readOnly ? <th className={styles.colActions} aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className={styles.schoolCell}>
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt="" className={styles.schoolAvatar} />
                    ) : (
                      <div
                        className={styles.schoolAvatar}
                        style={{ background: s.accentColor }}
                      >
                        {initials(s.name, s.code)}
                      </div>
                    )}
                    <span className={styles.schoolName}>{s.name}</span>
                  </div>
                </td>
                <td className={styles.colNum}>{s.studentCount.toString().padStart(2, "0")}</td>
                <td className={styles.colNum}>{s.printJobCount.toString().padStart(2, "0")}</td>
                <td className={styles.colNum}>{s.hasTemplate ? "01" : "00"}</td>
                <td className={styles.colStatus}>
                  <div className={styles.statusCell}>
                    {s.printReady ? (
                      <span className={styles.statusBadgeReady}>Ready to print</span>
                    ) : s.setupStatus === "needs_layout" ? (
                      <span className={styles.statusBadgeWarn}>Needs layout</span>
                    ) : s.setupStatus === "needs_template" ? (
                      <span className={styles.statusBadgeWarn}>No template</span>
                    ) : s.setupStatus === "needs_students" ? (
                      <span className={styles.statusBadgeWarn}>No students</span>
                    ) : (
                      <span className={styles.statusBadge}>Active</span>
                    )}
                  </div>
                </td>
                {!readOnly && onDelete ? (
                  <td className={styles.colActions}>
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        className={styles.menuBtn}
                        aria-label={`Actions for ${s.name}`}
                        onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenu === s.id && isSuperAdmin ? (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            zIndex: 10,
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "0.5rem",
                            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                            minWidth: "8rem",
                          }}
                        >
                          <button
                            type="button"
                            style={{
                              display: "flex",
                              width: "100%",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem 0.75rem",
                              fontSize: "0.8rem",
                              color: "#dc2626",
                              background: "transparent",
                              border: 0,
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              setOpenMenu(null);
                              onDelete(s.id, s.name);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No schools match your search.</p>
        ) : null}
      </div>
      <div className={styles.panelFooter}>
        <Link href="/schools" className={styles.linkBtn}>
          View all schools
        </Link>
      </div>
    </section>
  );
}
