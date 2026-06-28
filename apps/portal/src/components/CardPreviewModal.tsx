"use client";

import Link from "next/link";
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
  imageSrcBack?: string;
  imageAlt?: string;
  errors?: string[];
  initialSide?: "front" | "back";
};

export function CardPreviewModal({
  open,
  onClose,
  title,
  subtitle,
  imageSrc,
  imageSrcBack,
  imageAlt,
  errors = [],
  initialSide = "front",
}: CardPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [side, setSide] = useState<"front" | "back">(initialSide);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      return;
    }
    setSide(initialSide);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, initialSide]);

  if (!open) return null;

  const activeSrc = side === "back" && imageSrcBack ? imageSrcBack : imageSrc;
  const showTabs = Boolean(imageSrcBack);

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
            {showTabs ? (
              <div className={styles.sideTabs} role="tablist" aria-label="Card side">
                <button
                  type="button"
                  role="tab"
                  aria-selected={side === "front"}
                  className={side === "front" ? styles.sideTabActive : styles.sideTab}
                  onClick={() => setSide("front")}
                >
                  Front
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={side === "back"}
                  className={side === "back" ? styles.sideTabActive : styles.sideTab}
                  onClick={() => setSide("back")}
                >
                  Back
                </button>
              </div>
            ) : null}
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
              src={activeSrc}
              alt={imageAlt ?? `${title} ${side}`}
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
            {showTabs
              ? "Switch Front/Back to verify both sides match what will be printed."
              : "Click outside or press Esc to close. Use zoom to inspect text and photo alignment."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CardPreviewThumbnail({
  imageSrc,
  imageSrcBack,
  imageAlt,
  onOpen,
}: {
  imageSrc: string;
  imageSrcBack?: string;
  imageAlt: string;
  onOpen: (side?: "front" | "back") => void;
}) {
  return (
    <div className={styles.thumbGroup}>
      <button type="button" className={styles.thumbButton} onClick={() => onOpen("front")} aria-label={`Enlarge front of ${imageAlt}`}>
        <p className={styles.thumbSideLabel}>Front</p>
        <div className="card-3d overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--persian-prince)]/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={`Front of ${imageAlt}`} className="block w-full" />
        </div>
      </button>
      {imageSrcBack ? (
        <button type="button" className={styles.thumbButton} onClick={() => onOpen("back")} aria-label={`Enlarge back of ${imageAlt}`}>
          <p className={styles.thumbSideLabel}>Back</p>
          <div className="card-3d overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--persian-prince)]/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrcBack} alt={`Back of ${imageAlt}`} className="block w-full" />
          </div>
        </button>
      ) : null}
      <p className={styles.thumbHint}>Click a card side to open full preview</p>
    </div>
  );
}
