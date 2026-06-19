"use client";

import { formatClassSection } from "@/lib/class-section";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./students.module.css";

export type ClassSectionRow = {
  class: string;
  section: string;
  label: string;
  count: number;
  withPhoto: number;
};

type ClassSectionsPanelProps = {
  rows: ClassSectionRow[];
  activeClass: string;
  activeSection: string;
  onSelect: (row: ClassSectionRow | null) => void;
};

export function ClassSectionsPanel({
  rows,
  activeClass,
  activeSection,
  onSelect,
}: ClassSectionsPanelProps) {
  const activeLabel =
    activeClass && activeSection ? formatClassSection(activeClass, activeSection) : null;

  return (
    <section className={styles.classSectionsPanel}>
      <div className={styles.classSectionsHead}>
        <div>
          <h2 className={styles.classSectionsTitle}>Class–section groups</h2>
          <p className={styles.classSectionsDesc}>
            Each school has its own classes. Students import into a class–section (e.g. 10-A).
          </p>
        </div>
        {activeLabel ? (
          <button type="button" className={dash.linkBtn} onClick={() => onSelect(null)}>
            Clear filter
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className={styles.classSectionsEmpty}>
          No class–sections yet. Import an Excel file with Class and Section columns for this school.
        </p>
      ) : (
        <div className={styles.classSectionsGrid}>
          {rows.map((row) => {
            const isActive = row.class === activeClass && row.section === activeSection;
            return (
              <button
                key={row.label}
                type="button"
                className={`${styles.classSectionCard} ${isActive ? styles.classSectionCardActive : ""}`}
                onClick={() => onSelect(isActive ? null : row)}
              >
                <p className={styles.classSectionLabel}>{row.label}</p>
                <p className={styles.classSectionCount}>
                  {row.count} student{row.count === 1 ? "" : "s"}
                </p>
                <p className={styles.classSectionMeta}>
                  {row.withPhoto} with photo{row.withPhoto === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
