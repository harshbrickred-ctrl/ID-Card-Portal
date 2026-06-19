"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import styles from "./dashboard.module.css";

type PrintJob = {
  id: string;
  cardCount: number;
  createdAt: string;
  school: { name: string; code: string; accentColor: string };
};

export function RecentPrintJobs({ jobs }: { jobs: PrintJob[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Recent Print Jobs</h2>
        <Link href="/print" className={styles.linkBtn}>
          View all
        </Link>
      </div>
      {jobs.length === 0 ? (
        <p className={styles.empty}>No print jobs yet — go to Print to generate cards.</p>
      ) : (
        jobs.map((p) => (
          <div key={p.id} className={styles.printJobRow}>
            <div className={styles.printJobLeft}>
              <div
                className={styles.printJobIcon}
                style={{ background: `${p.school.accentColor}22`, color: p.school.accentColor }}
              >
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <p className={styles.printJobTitle}>
                  {p.school.code} · {p.cardCount} cards
                </p>
                <p className={styles.printJobSub}>{p.school.name}</p>
              </div>
            </div>
            <time className={styles.printJobTime} dateTime={p.createdAt}>
              {new Date(p.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>
        ))
      )}
    </section>
  );
}
