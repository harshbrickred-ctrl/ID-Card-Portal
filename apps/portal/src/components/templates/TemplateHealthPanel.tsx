"use client";

import { AlertTriangle, CheckCircle2, HeartPulse } from "lucide-react";
import type { TemplateHealthReport } from "@idportal/card-engine";
import styles from "./TemplateHealthPanel.module.css";

type TemplateHealthPanelProps = {
  health: TemplateHealthReport;
  compact?: boolean;
};

const METRICS: { key: keyof TemplateHealthReport["scores"]; label: string }[] = [
  { key: "resolution", label: "Resolution" },
  { key: "dpi", label: "DPI" },
  { key: "contrast", label: "Contrast" },
  { key: "printability", label: "Printability" },
];

function gradeClass(grade: TemplateHealthReport["grade"]) {
  if (grade === "excellent") return styles.gradeExcellent;
  if (grade === "good") return styles.gradeGood;
  if (grade === "fair") return styles.gradeFair;
  return styles.gradePoor;
}

function barClass(score: number) {
  if (score >= 90) return styles.barExcellent;
  if (score >= 75) return styles.barGood;
  if (score >= 60) return styles.barFair;
  return styles.barPoor;
}

export function TemplateHealthPanel({ health, compact = false }: TemplateHealthPanelProps) {
  return (
    <section className={`${styles.panel} ${compact ? styles.panelCompact : ""}`} aria-label="Template health score">
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <HeartPulse className="h-4 w-4 text-[#0d9488]" />
          <h3>Template Health</h3>
        </div>
        <div className={`${styles.overall} ${gradeClass(health.grade)}`}>
          <span className={styles.overallValue}>{health.overall}</span>
          <span className={styles.overallLabel}>/100</span>
        </div>
      </div>

      <div className={styles.metrics}>
        {METRICS.map(({ key, label }) => {
          const score = health.scores[key];
          return (
            <div key={key} className={styles.metricRow}>
              <div className={styles.metricHead}>
                <span>{label}</span>
                <span className={styles.metricScore}>{score}/100</span>
              </div>
              <div className={styles.barTrack}>
                <div className={`${styles.barFill} ${barClass(score)}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {!compact ? (
        <p className={styles.meta}>
          {health.width}×{health.height}px
          {health.effectiveDpi ? ` · ~${health.effectiveDpi} DPI` : ""}
          {health.format ? ` · ${health.format.toUpperCase()}` : ""}
        </p>
      ) : null}

      {health.warnings.length > 0 ? (
        <ul className={styles.warnings}>
          {health.warnings.map((warning) => (
            <li key={warning}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.ok}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Template is in good shape for printing.
        </p>
      )}

      {!compact && health.tips.length > 0 ? (
        <ul className={styles.tips}>
          {health.tips.slice(0, 2).map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
