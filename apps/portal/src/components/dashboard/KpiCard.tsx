"use client";

import type { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import styles from "./dashboard.module.css";

type KpiCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
  accentBg: string;
  trend: number | null;
  sparkline: number[];
};

export function KpiCard({ label, value, icon: Icon, accent, accentBg, trend, sparkline }: KpiCardProps) {
  const trendClass =
    trend == null ? styles.trendNeutral : trend >= 0 ? styles.trendUp : styles.trendDown;
  const trendLabel =
    trend == null ? "—" : `${trend >= 0 ? "+" : ""}${trend}%`;

  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <div>
          <p className={styles.kpiLabel}>{label}</p>
          <p className={styles.kpiValue}>{value.toLocaleString()}</p>
        </div>
        <div className={styles.kpiIcon} style={{ background: accentBg, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={styles.kpiTrendRow}>
        <div>
          <span className={`${styles.kpiTrend} ${trendClass}`}>{trendLabel}</span>
          <span className={styles.kpiTrendSub}> from last month</span>
        </div>
        <Sparkline data={sparkline.length ? sparkline : [0, 0, 0, 0, 0, 0, 0]} color={accent} />
      </div>
    </div>
  );
}
