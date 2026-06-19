"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./schools.module.css";

export type SchoolFormValues = {
  name: string;
  code: string;
  address: string;
  accentColor: string;
  academicYear: string;
};

const emptyForm: SchoolFormValues = {
  name: "",
  code: "",
  address: "",
  accentColor: "#0d9488",
  academicYear: "2025-26",
};

type SchoolFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<SchoolFormValues>;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: SchoolFormValues) => void;
};

export function SchoolFormModal({
  open,
  mode,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: SchoolFormModalProps) {
  const [form, setForm] = useState<SchoolFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      ...initial,
      accentColor: initial?.accentColor ?? emptyForm.accentColor,
      academicYear: initial?.academicYear ?? emptyForm.academicYear,
    });
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={dash.modalBackdrop} onClick={onClose}>
      <div className={dash.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className={dash.modalTitle}>{mode === "create" ? "Add School" : "Edit School"}</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              {mode === "create"
                ? "Create a school profile used across templates, students, and print jobs."
                : "Update school details. Code must stay unique across all schools."}
            </p>
          </div>
          <button type="button" className={dash.iconBtn} onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? <p className={`${styles.banner} ${styles.bannerError}`}>{error}</p> : null}

        <form
          className={styles.formGrid}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div>
            <label className={styles.formLabel} htmlFor="school-name">
              School name
            </label>
            <input
              id="school-name"
              className={styles.formInput}
              placeholder="Green Valley Public School"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="school-code">
              School code
            </label>
            <input
              id="school-code"
              className={styles.formInput}
              placeholder="GVPS"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="school-year">
              Academic year
            </label>
            <input
              id="school-year"
              className={styles.formInput}
              placeholder="2025-26"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="school-address">
              Address
            </label>
            <input
              id="school-address"
              className={styles.formInput}
              placeholder="City, state"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="school-accent">
              Brand color
            </label>
            <div className={styles.colorRow}>
              <input
                id="school-accent"
                type="color"
                className={styles.colorSwatch}
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
              />
              <input
                className={`${styles.formInput} ${styles.colorHex}`}
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>

          <div className={dash.modalActions}>
            <button type="button" className={dash.modalCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={dash.modalSubmit} disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create School" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
