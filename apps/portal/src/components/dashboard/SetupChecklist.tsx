"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, FileImage, Printer, Users } from "lucide-react";
import styles from "./SetupChecklist.module.css";

export type SetupSchool = {
  id: string;
  name: string;
  code: string;
  accentColor: string;
  studentCount: number;
  hasTemplate: boolean;
  hasLayout: boolean;
  templateId: string | null;
  setupStatus: "ready" | "needs_students" | "needs_template" | "needs_layout";
  printReady: boolean;
};

const STEP_META = {
  needs_students: {
    icon: Users,
    label: "Add students",
    hint: "Import or add student records with photos",
    href: (id: string) => `/students?schoolId=${id}`,
  },
  needs_template: {
    icon: FileImage,
    label: "Upload template",
    hint: "Upload the school's ID card design (PNG or JPG)",
    href: (id: string) => `/templates?schoolId=${id}`,
  },
  needs_layout: {
    icon: FileImage,
    label: "Save field layout",
    hint: "Place photo, signature, and text fields on the card",
    href: (_id: string, templateId: string | null) =>
      templateId ? `/templates/${templateId}/layout` : `/templates?schoolId=${_id}`,
  },
  ready: {
    icon: Printer,
    label: "Print IDs",
    hint: "Preview and download cards for printing",
    href: (id: string) => `/print?schoolId=${id}`,
  },
} as const;

export function SetupChecklist({ schools }: { schools: SetupSchool[] }) {
  const pending = schools.filter((s) => !s.printReady);
  const readyCount = schools.filter((s) => s.printReady).length;

  if (schools.length === 0) {
    return (
      <section className={styles.panel}>
        <h2 className={styles.title}>Get started</h2>
        <p className={styles.desc}>
          Create your first school, then follow the setup steps to print ID cards.
        </p>
        <Link href="/schools?new=1" className={styles.primaryLink}>
          Create a school
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>School setup checklist</h2>
          <p className={styles.desc}>
            {readyCount} of {schools.length} schools ready to print
            {pending.length > 0 ? ` · ${pending.length} need attention` : ""}
          </p>
        </div>
        {pending.length === 0 ? (
          <span className={styles.allReady}>
            <CheckCircle2 className="h-4 w-4" />
            All schools ready
          </span>
        ) : null}
      </div>

      <div className={styles.grid}>
        {schools.map((school) => {
          const step = STEP_META[school.setupStatus];
          const StepIcon = step.icon;
          return (
            <article
              key={school.id}
              className={`${styles.card} ${school.printReady ? styles.cardReady : styles.cardPending}`}
            >
              <div className={styles.cardHead}>
                <span className={styles.badge} style={{ background: school.accentColor }}>
                  {school.code}
                </span>
                <p className={styles.schoolName}>{school.name}</p>
              </div>

              <ol className={styles.steps}>
                <li className={school.studentCount > 0 ? styles.stepDone : styles.stepTodo}>
                  {school.studentCount > 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={styles.stepNum}>1</span>}
                  Students ({school.studentCount})
                </li>
                <li className={school.hasTemplate ? styles.stepDone : styles.stepTodo}>
                  {school.hasTemplate ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={styles.stepNum}>2</span>}
                  Template uploaded
                </li>
                <li className={school.hasLayout ? styles.stepDone : styles.stepTodo}>
                  {school.hasLayout ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={styles.stepNum}>3</span>}
                  Layout saved
                </li>
              </ol>

              {school.printReady ? (
                <Link href={`/print?schoolId=${school.id}`} className={styles.actionReady}>
                  <Printer className="h-4 w-4" />
                  Print IDs
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link href={step.href(school.id, school.templateId)} className={styles.actionPending}>
                  <StepIcon className="h-4 w-4" />
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.hint}</small>
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </article>
          );
        })}
      </div>

      {pending.length > 0 ? (
        <p className={styles.footerNote}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Preview shows front and back exactly as they will print. Fix all blockers before downloading.
        </p>
      ) : null}
    </section>
  );
}
