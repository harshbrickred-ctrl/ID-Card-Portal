"use client";

import { useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type ClassRow = { class: string; count: number; schoolId?: string };

type SchoolOption = { id: string; name: string };

type ClassBreakdownPanelProps = {
  breakdown: ClassRow[];
  schools: SchoolOption[];
  studentsBySchool: Record<string, ClassRow[]>;
};

export function ClassBreakdownPanel({
  breakdown,
  schools,
  studentsBySchool,
}: ClassBreakdownPanelProps) {
  const [schoolId, setSchoolId] = useState("all");

  const rows = useMemo(() => {
    if (schoolId === "all") return breakdown;
    return studentsBySchool[schoolId] ?? [];
  }, [schoolId, breakdown, studentsBySchool]);

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Students by Class</h2>
        <select
          className={styles.select}
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
        >
          <option value="all">All Schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.classBody}>
        {rows.length === 0 ? (
          <p className={styles.empty}>No students for this selection.</p>
        ) : (
          rows.map((c) => (
            <div key={c.class} className={styles.classRow}>
              <span className={styles.classLabel}>Class {c.class}</span>
              <div className={styles.classBarTrack}>
                <div
                  className={styles.classBarFill}
                  style={{ width: `${(c.count / max) * 100}%` }}
                />
              </div>
              <span className={styles.classCount}>{c.count}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
