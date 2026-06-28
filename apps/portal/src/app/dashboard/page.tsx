"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Building2, CreditCard, Plus, Printer, Search, Users } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { ClassBreakdownPanel } from "@/components/dashboard/ClassBreakdownPanel";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { PrintActivityChart } from "@/components/dashboard/PrintActivityChart";
import { RecentPrintJobs } from "@/components/dashboard/RecentPrintJobs";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { SchoolsTable } from "@/components/dashboard/SchoolsTable";
import styles from "@/components/dashboard/dashboard.module.css";

type DashboardData = {
  stats: {
    totalSchools: number;
    totalStudents: number;
    totalPrintJobs: number;
    totalCardsPrinted: number;
  };
  trends: {
    schools: number | null;
    students: number | null;
    printJobs: number | null;
    cardsPrinted: number | null;
  };
  sparklines: {
    schools: number[];
    students: number[];
    printJobs: number[];
    cardsPrinted: number[];
  };
  printActivity: { date: string; label: string; cards: number; jobs: number }[];
  classBreakdown: { class: string; count: number }[];
  studentsBySchool: Record<string, { class: string; count: number }[]>;
  recentPrints: {
    id: string;
    cardCount: number;
    createdAt: string;
    school: { name: string; code: string; accentColor: string };
  }[];
  schools: {
    id: string;
    name: string;
    code: string;
    accentColor: string;
    logoUrl: string | null;
    studentCount: number;
    printJobCount: number;
    hasTemplate: boolean;
    hasLayout: boolean;
    templateId: string | null;
    templateName: string | null;
    setupStatus: "ready" | "needs_students" | "needs_template" | "needs_layout";
    printReady: boolean;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");

  async function load() {
    const d = await apiFetch<DashboardData>("/v1/dashboard");
    setData(d);
  }

  useEffect(() => {
    void load();
  }, []);

  if (!data) {
    return <div className={styles.loading}>Loading dashboard…</div>;
  }

  const schoolOptions = data.schools.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className={styles.root}>
      <div className={styles.pageInner}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Dashboard</h1>
          <p className={styles.headerDesc}>Overview of schools, students, and print activity</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search anything…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>
          <button type="button" className={styles.iconBtn} style={{ position: "relative" }} aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {data.recentPrints.length > 0 ? <span className={styles.notifDot} /> : null}
          </button>
          <Link href="/schools?new=1" className={styles.primaryBtn}>
            <Plus className="h-4 w-4" />
            New School
          </Link>
        </div>
      </header>

      <SetupChecklist schools={data.schools} />

      <div className={styles.kpiGrid}>
        <KpiCard
          label="Total Schools"
          value={data.stats.totalSchools}
          icon={Building2}
          accent="#0d9488"
          accentBg="#ccfbf1"
          trend={data.trends.schools}
          sparkline={data.sparklines.schools}
        />
        <KpiCard
          label="Total Students"
          value={data.stats.totalStudents}
          icon={Users}
          accent="#3b82f6"
          accentBg="#dbeafe"
          trend={data.trends.students}
          sparkline={data.sparklines.students}
        />
        <KpiCard
          label="Print Jobs"
          value={data.stats.totalPrintJobs}
          icon={Printer}
          accent="#8b5cf6"
          accentBg="#ede9fe"
          trend={data.trends.printJobs}
          sparkline={data.sparklines.printJobs}
        />
        <KpiCard
          label="Cards Printed"
          value={data.stats.totalCardsPrinted}
          icon={CreditCard}
          accent="#f97316"
          accentBg="#ffedd5"
          trend={data.trends.cardsPrinted}
          sparkline={data.sparklines.cardsPrinted}
        />
      </div>

      <div className={styles.midGrid}>
        <SchoolsTable
          readOnly
          schools={
            globalSearch.trim()
              ? data.schools.filter((s) => {
                  const q = globalSearch.toLowerCase();
                  return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
                })
              : data.schools
          }
        />
        <ClassBreakdownPanel
          breakdown={data.classBreakdown}
          schools={schoolOptions}
          studentsBySchool={data.studentsBySchool}
        />
      </div>

      <div className={styles.bottomGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Print Activity</h2>
            <select className={styles.select} defaultValue="week" aria-label="Activity range">
              <option value="week">This Week</option>
            </select>
          </div>
          <PrintActivityChart data={data.printActivity} />
        </section>
        <RecentPrintJobs jobs={data.recentPrints} />
      </div>
      </div>
    </div>
  );
}
