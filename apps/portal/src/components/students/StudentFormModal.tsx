"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./students.module.css";

export type StudentFormValues = {
  enrollId: string;
  name: string;
  class: string;
  section: string;
  dob: string;
  phoneNumber: string;
  address: string;
};

const emptyForm: StudentFormValues = {
  enrollId: "",
  name: "",
  class: "",
  section: "",
  dob: "",
  phoneNumber: "",
  address: "",
};

type StudentFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<StudentFormValues>;
  photoPreview: string | null;
  existingPhotoUrl: string | null;
  photoMessage: string;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => void;
  onPhotoChange: (file: File | null) => void;
};

export function StudentFormModal({
  open,
  mode,
  initial,
  photoPreview,
  existingPhotoUrl,
  photoMessage,
  saving,
  error,
  onClose,
  onSubmit,
  onPhotoChange,
}: StudentFormModalProps) {
  const [form, setForm] = useState<StudentFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, ...initial });
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

  const previewSrc = photoPreview ?? existingPhotoUrl;

  return (
    <div className={dash.modalBackdrop} onClick={onClose}>
      <div
        className={dash.modal}
        style={{ maxWidth: "min(100%, 36rem)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className={dash.modalTitle}>{mode === "create" ? "Add Student" : "Edit Student"}</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Required: name, enroll ID, class, and section. Photo optional.
            </p>
          </div>
          <button type="button" className={dash.iconBtn} onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? <p className={`${styles.banner} ${styles.bannerError} mb-3`}>{error}</p> : null}

        <form
          className={styles.formGrid}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div>
            <label className={styles.formLabel} htmlFor="student-name">
              Full name
            </label>
            <input
              id="student-name"
              className={styles.formInput}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="student-enroll">
              Enroll ID
            </label>
            <input
              id="student-enroll"
              className={styles.formInput}
              value={form.enrollId}
              onChange={(e) => setForm({ ...form, enrollId: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="student-class">
              Class
            </label>
            <input
              id="student-class"
              className={styles.formInput}
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="student-section">
              Section
            </label>
            <input
              id="student-section"
              className={styles.formInput}
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="student-dob">
              DOB
            </label>
            <input
              id="student-dob"
              className={styles.formInput}
              placeholder="2010-05-12"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>
          <div>
            <label className={styles.formLabel} htmlFor="student-phone">
              Phone
            </label>
            <input
              id="student-phone"
              className={styles.formInput}
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
          </div>
          <div className={styles.formGridWide}>
            <label className={styles.formLabel} htmlFor="student-address">
              Address
            </label>
            <input
              id="student-address"
              className={styles.formInput}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className={styles.formGridWide}>
            <label className={styles.formLabel}>Student photo</label>
            <div className={styles.photoPreviewRow}>
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="" className={styles.photoPreviewBox} />
              ) : (
                <div className={styles.photoPlaceholder}>No photo</div>
              )}
              <input
                className={`${styles.formInput} ${styles.fileInput}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
              />
            </div>
            {photoMessage ? <p className="mt-2 text-sm text-[#047857]">{photoMessage}</p> : null}
          </div>

          <div className={`${dash.modalActions} ${styles.formGridWide}`}>
            <button type="button" className={dash.modalCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={dash.modalSubmit} disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create Student" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
