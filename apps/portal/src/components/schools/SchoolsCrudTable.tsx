"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./schools.module.css";

export type SchoolRecord = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  accentColor: string;
  academicYear: string | null;
  logoUrl: string | null;
  createdAt: string;
  studentCount: number;
  printJobCount: number;
  hasTemplate: boolean;
  templateName: string | null;
};

type SchoolsCrudTableProps = {
  schools: SchoolRecord[];
  isSuperAdmin: boolean;
  onView: (school: SchoolRecord) => void;
  onEdit: (school: SchoolRecord) => void;
  onDelete: (school: SchoolRecord) => void;
};

function initials(name: string, code: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return code.slice(0, 2).toUpperCase();
}

export function SchoolsCrudTable({
  schools,
  isSuperAdmin,
  onView,
  onEdit,
  onDelete,
}: SchoolsCrudTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    function close() {
      setOpenMenu(null);
    }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenu]);

  return (
    <section className={dash.panel}>
      <div className={dash.panelHeader}>
        <h2 className={dash.panelTitle}>All schools</h2>
        <p className="text-sm text-[#64748b]">{schools.length} shown</p>
      </div>
      <div className={dash.tableWrap}>
        <table className={dash.table}>
          <thead>
            <tr>
              <th>School Name</th>
              <th className={dash.colNum}>Students</th>
              <th className={dash.colNum}>Print Jobs</th>
              <th className={dash.colNum}>Templates</th>
              <th className={dash.colStatus}>Status</th>
              <th className={dash.colActions} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s.id}>
                <td>
                  <button
                    type="button"
                    className={`${dash.schoolCell} border-0 bg-transparent p-0 text-left`}
                    onClick={() => onView(s)}
                  >
                    <div className={dash.schoolAvatar} style={{ background: s.accentColor }}>
                      {initials(s.name, s.code)}
                    </div>
                    <span className={dash.schoolName}>{s.name}</span>
                  </button>
                </td>
                <td className={dash.colNum}>{s.studentCount.toString().padStart(2, "0")}</td>
                <td className={dash.colNum}>{s.printJobCount.toString().padStart(2, "0")}</td>
                <td className={dash.colNum}>{s.hasTemplate ? "01" : "00"}</td>
                <td className={dash.colStatus}>
                  <div className={dash.statusCell}>
                    <span className={dash.statusBadge}>Active</span>
                  </div>
                </td>
                <td className={dash.colActions}>
                  <div
                    className={styles.menuWrap}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        <button type="button" className={styles.menuItem} onClick={() => { setOpenMenu(null); onView(s); }}>
                          <Eye className="h-4 w-4" />
                          View details
                        </button>
                        <button type="button" className={styles.menuItem} onClick={() => { setOpenMenu(null); onEdit(s); }}>
                          <Pencil className="h-4 w-4" />
                          Edit school
                        </button>
                        <Link href={`/students?schoolId=${s.id}`} className={styles.menuItem}>
                          Manage students
                        </Link>
                        <Link href={`/templates?schoolId=${s.id}`} className={styles.menuItem}>
                          Templates
                        </Link>
                        {isSuperAdmin ? (
                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={() => {
                              setOpenMenu(null);
                              onDelete(s);
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
        {schools.length === 0 ? <p className={dash.empty}>No schools found.</p> : null}
      </div>
    </section>
  );
}

type SchoolDetailDrawerProps = {
  school: SchoolRecord | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onEdit: (school: SchoolRecord) => void;
  onDelete: (school: SchoolRecord) => void;
};

export function SchoolDetailDrawer({
  school,
  isSuperAdmin,
  onClose,
  onEdit,
  onDelete,
}: SchoolDetailDrawerProps) {
  useEffect(() => {
    if (!school) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [school, onClose]);

  if (!school) return null;

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <aside className={styles.drawer} aria-label={`${school.name} details`}>
        <div className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{school.name}</h2>
            <p className={styles.drawerSub}>
              {school.code}
              {school.academicYear ? ` · ${school.academicYear}` : ""}
            </p>
          </div>
          <button type="button" className={dash.menuBtn} onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Students</span>
            <span className={styles.detailValue}>{school.studentCount}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Print jobs</span>
            <span className={styles.detailValue}>{school.printJobCount}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Template</span>
            <span className={styles.detailValue}>{school.hasTemplate ? school.templateName ?? "Uploaded" : "Not uploaded"}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Address</span>
            <span className={styles.detailValue}>{school.address || "—"}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Brand color</span>
            <span className={styles.detailValue}>{school.accentColor}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Created</span>
            <span className={styles.detailValue}>
              {new Date(school.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className={styles.drawerActions}>
          <button type="button" className={`${styles.drawerBtn} ${styles.drawerBtnPrimary}`} onClick={() => onEdit(school)}>
            <Pencil className="h-4 w-4" />
            Edit school
          </button>
          <Link href={`/students?schoolId=${school.id}`} className={`${styles.drawerBtn} ${styles.drawerBtnGhost}`}>
            Manage students
          </Link>
          {isSuperAdmin ? (
            <button
              type="button"
              className={`${styles.drawerBtn} ${styles.drawerBtnDanger}`}
              onClick={() => onDelete(school)}
            >
              <Trash2 className="h-4 w-4" />
              Delete school
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
