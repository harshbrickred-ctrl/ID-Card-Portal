"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ZoomControls } from "@/components/ui";
import styles from "./CardPreviewModal.module.css";

export type CardPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt?: string;
  errors?: string[];
};

export function CardPreviewModal({
  open,
  onClose,
  title,
  subtitle,
  imageSrc,
  imageAlt,
  errors = [],
}: CardPreviewModalProps) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-preview-title"
      onClick={onClose}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 id="card-preview-title" className="text-lg font-semibold text-[var(--angora-goat)]">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <ZoomControls zoom={zoom} onZoomChange={setZoom} label="Zoom" />
            <button
              type="button"
              className="btn-ghost rounded-lg p-2"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.imageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={imageAlt ?? title}
              className={styles.image}
              style={{ width: `${Math.min(920, 640 * zoom)}px`, maxWidth: "none" }}
            />
          </div>
          {errors.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-warning">
              {errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={styles.footer}>
          <p className="text-xs text-[var(--muted-foreground)]">
            Click outside or press Esc to close. Use zoom to inspect text and photo alignment.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CardPreviewThumbnail({
  imageSrc,
  imageAlt,
  onOpen,
}: {
  imageSrc: string;
  imageAlt: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={styles.thumbButton} onClick={onOpen} aria-label={`Enlarge ${imageAlt}`}>
      <div className="card-3d overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--persian-prince)]/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} className="block w-full" />
      </div>
      <p className={styles.thumbHint}>Click card to open full preview</p>
    </button>
  );
}
