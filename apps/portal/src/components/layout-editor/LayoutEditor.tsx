"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, Save } from "lucide-react";
import type { TemplateFieldKeyDto, TemplateLayoutDto } from "@idportal/contracts";
import { createDefaultLayoutForSource, DEFAULT_FIELD_LABELS } from "@idportal/contracts";
import { apiFetch } from "@/lib/api/client";
import { CardPreviewModal } from "@/components/CardPreviewModal";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "./LayoutEditor.module.css";

const EDITOR_FIELDS: TemplateFieldKeyDto[] = [
  "name",
  "enrollId",
  "classSection",
  "dob",
  "phone",
  "address",
  "academicYear",
];

const FIELD_LABELS = DEFAULT_FIELD_LABELS;

type Selection = "photo" | "signature" | TemplateFieldKeyDto | "label";

type DragState = {
  target: Selection;
  fieldKey?: TemplateFieldKeyDto;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export type LayoutEditorTemplate = {
  id: string;
  name: string;
  fileUrl: string;
  signatureUrl: string | null;
  layoutJson: unknown;
  sourceWidth: number | null;
  sourceHeight: number | null;
  school: { name: string; code: string };
  dimensions: { width: number; height: number };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function defaultLabelPosition(field: TemplateLayoutDto["fields"][number], sourceWidth: number) {
  const offset = Math.max(80, Math.round(sourceWidth * 0.22));
  return {
    labelX: clamp(field.x - offset, 8, sourceWidth - 8),
    labelY: field.y,
  };
}

function ensureFieldLabels(layout: TemplateLayoutDto): TemplateLayoutDto {
  return {
    ...layout,
    fields: layout.fields.map((field) => {
      if (!field.showLabel) return field;
      const defaults = defaultLabelPosition(field, layout.sourceWidth ?? 1011);
      return {
        ...field,
        labelX: field.labelX ?? defaults.labelX,
        labelY: field.labelY ?? defaults.labelY,
      };
    }),
  };
}

function normalizeLayout(
  raw: unknown,
  sourceWidth: number,
  sourceHeight: number,
): TemplateLayoutDto {
  const base =
    raw && typeof raw === "object" && "fields" in raw
      ? { ...(raw as TemplateLayoutDto), sourceWidth, sourceHeight }
      : createDefaultLayoutForSource(sourceWidth, sourceHeight);
  return ensureFieldLabels(base);
}

function ZoomBar({
  zoom,
  onChange,
  min = 0.5,
  max = 2.5,
  step = 0.25,
}: {
  zoom: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const clampZoom = (value: number) => Math.min(max, Math.max(min, value));

  return (
    <div className={styles.zoomBar} aria-label="Template zoom">
      <button
        type="button"
        className={styles.zoomBtn}
        disabled={zoom <= min}
        onClick={() => onChange(clampZoom(Number((zoom - step).toFixed(2))))}
        aria-label="Zoom out"
      >
        −
      </button>
      <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
      <button
        type="button"
        className={styles.zoomBtn}
        disabled={zoom >= max}
        onClick={() => onChange(clampZoom(Number((zoom + step).toFixed(2))))}
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}

export function LayoutEditor({ template }: { template: LayoutEditorTemplate }) {
  const sourceWidth = template.dimensions.width;
  const sourceHeight = template.dimensions.height;

  const [layout, setLayout] = useState<TemplateLayoutDto>(() =>
    normalizeLayout(template.layoutJson, sourceWidth, sourceHeight),
  );
  const [selected, setSelected] = useState<Selection>("name");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ name: string; enrollId: string } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const baseDisplayWidth = 920;
  const displayWidth = Math.round(baseDisplayWidth * zoom);
  const scale = displayWidth / sourceWidth;
  const displayHeight = Math.round(sourceHeight * scale);

  const selectedField = useMemo(
    () => layout.fields.find((f) => f.key === selected),
    [layout.fields, selected],
  );

  const selectedLabel =
    selected === "photo"
      ? "Photo area"
      : selected === "signature"
        ? "Signature area"
        : selectedField
          ? FIELD_LABELS[selectedField.key]
          : null;

  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;

    function onMove(e: PointerEvent) {
      const dx = (e.clientX - activeDrag.startX) / scale;
      const dy = (e.clientY - activeDrag.startY) / scale;
      const x = Math.round(activeDrag.originX + dx);
      const y = Math.round(activeDrag.originY + dy);

      setLayout((prev) => {
        if (activeDrag.target === "photo") {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              x: clamp(x, 0, sourceWidth - prev.photo.width),
              y: clamp(y, 0, sourceHeight - prev.photo.height),
            },
          };
        }
        if (activeDrag.target === "signature") {
          return {
            ...prev,
            signature: {
              ...prev.signature,
              x: clamp(x, 0, sourceWidth - prev.signature.width),
              y: clamp(y, 0, sourceHeight - prev.signature.height),
            },
          };
        }
        if (activeDrag.fieldKey) {
          return {
            ...prev,
            fields: prev.fields.map((field) => {
              if (field.key !== activeDrag.fieldKey) return field;
              if (activeDrag.target === "label") {
                return { ...field, labelX: x, labelY: y };
              }
              return { ...field, x, y };
            }),
          };
        }
        return prev;
      });
    }

    function onUp() {
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, scale, sourceHeight, sourceWidth]);

  function startDrag(
    e: React.PointerEvent,
    target: Selection,
    originX: number,
    originY: number,
    fieldKey?: TemplateFieldKeyDto,
  ) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(fieldKey ?? target);
    setDrag({
      target,
      fieldKey,
      startX: e.clientX,
      startY: e.clientY,
      originX,
      originY,
    });
  }

  function updateField(key: TemplateFieldKeyDto, patch: Partial<TemplateLayoutDto["fields"][number]>) {
    setLayout((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.key === key ? { ...field, ...patch } : field)),
    }));
  }

  function ensureField(key: TemplateFieldKeyDto) {
    setLayout((prev) => {
      if (prev.fields.some((f) => f.key === key)) return prev;
      const last = prev.fields[prev.fields.length - 1];
      const y = last ? last.y + Math.round(sourceHeight * 0.08) : Math.round(sourceHeight * 0.3);
      return {
        ...prev,
        fields: [
          ...prev.fields,
          {
            key,
            x: Math.round(sourceWidth * 0.55),
            y,
            fontSize: 22,
            maxWidth: Math.round(sourceWidth * 0.35),
            showLabel: true,
            labelX: Math.round(sourceWidth * 0.4),
            labelY: y,
            dominantBaseline: "middle" as const,
            fill: "#1a2e4a",
          },
        ],
      };
    });
  }

  async function saveLayout() {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch(`/v1/templates/${template.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...layout, sourceWidth, sourceHeight }),
      });
      setMessageType("success");
      setMessage("Layout saved. Open Print for this school to preview and download cards.");
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setPreviewing(true);
    setMessage("");
    try {
      const result = await apiFetch<{ previewFront: string; studentName: string; enrollId: string }>(
        `/v1/templates/${template.id}/layout/preview`,
        {
          method: "POST",
          body: JSON.stringify({ layout: { ...layout, sourceWidth, sourceHeight } }),
        },
      );
      setPreviewUrl(result.previewFront);
      setPreviewMeta({ name: result.studentName, enrollId: result.enrollId });
      setPreviewModalOpen(true);
      setMessageType("success");
      setMessage(`Preview rendered with sample student ${result.studentName}.`);
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <>
      <header className={dash.header}>
        <div>
          <h1 className={dash.headerTitle}>Visual layout editor</h1>
          <p className={dash.headerDesc}>
            Drag fields onto your template so student data prints in the right place
          </p>
        </div>
        <div className={dash.headerActions}>
          <button
            type="button"
            className={styles.previewBtn}
            disabled={previewing}
            onClick={() => void runPreview()}
          >
            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Preview card
          </button>
          <button type="button" className={dash.primaryBtn} disabled={saving} onClick={() => void saveLayout()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save layout
          </button>
        </div>
      </header>

      <div className={styles.editorGrid}>
        <div className={styles.canvasPanel}>
          <div className={styles.canvasToolbar}>
            <Link href="/templates" className={styles.backLink}>
              <ArrowLeft className="h-4 w-4" />
              Back to templates
            </Link>
            <div className={styles.toolbarMeta}>
              <span className={styles.dimBadge}>
                {sourceWidth}×{sourceHeight}px · CR-80
              </span>
              <ZoomBar zoom={zoom} onChange={setZoom} />
            </div>
          </div>

          <div className={styles.canvasWrap}>
            <div
              ref={canvasRef}
              className={styles.canvas}
              style={{ width: displayWidth, height: displayHeight }}
              onClick={() => setSelected("photo")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.fileUrl} alt={template.name} className={styles.templateImg} draggable={false} />

              <div
                className={`${styles.region} ${selected === "photo" ? styles.regionSelected : ""}`}
                style={{
                  left: layout.photo.x * scale,
                  top: layout.photo.y * scale,
                  width: layout.photo.width * scale,
                  height: layout.photo.height * scale,
                }}
                onPointerDown={(e) => startDrag(e, "photo", layout.photo.x, layout.photo.y)}
              >
                <span className={styles.regionLabel}>Photo</span>
              </div>

              <div
                className={`${styles.region} ${selected === "signature" ? styles.regionSelected : ""}`}
                style={{
                  left: layout.signature.x * scale,
                  top: layout.signature.y * scale,
                  width: layout.signature.width * scale,
                  height: layout.signature.height * scale,
                }}
                onPointerDown={(e) => startDrag(e, "signature", layout.signature.x, layout.signature.y)}
              >
                <span className={styles.regionLabel}>Signature</span>
              </div>

              {layout.fields.map((field) => {
                const isSelected = selected === field.key;
                const labelActive = drag?.target === "label" && drag.fieldKey === field.key;
                const showLabelMarker = Boolean(field.showLabel);
                const labelX = field.labelX ?? defaultLabelPosition(field, sourceWidth).labelX;
                const labelY = field.labelY ?? field.y;
                return (
                  <div key={field.key}>
                    {showLabelMarker ? (
                      <div
                        className={`${styles.markerLabel} ${labelActive || (isSelected && field.showLabel) ? styles.markerLabelSelected : ""}`}
                        style={{ left: labelX * scale, top: labelY * scale }}
                        title={`${FIELD_LABELS[field.key]} label — drag to move`}
                        onPointerDown={(e) => startDrag(e, "label", labelX, labelY, field.key)}
                      >
                        L
                      </div>
                    ) : null}
                    <div
                      className={`${styles.marker} ${isSelected ? styles.markerSelected : ""}`}
                      style={{ left: field.x * scale, top: field.y * scale }}
                      title={`${FIELD_LABELS[field.key]} value — drag to move`}
                      onPointerDown={(e) => startDrag(e, field.key, field.x, field.y, field.key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className={styles.sidebarPanel}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.sidebarTitle}>Field layout</h2>
            <p className={styles.sidebarDesc}>{template.name}</p>
            <span className={styles.schoolPill}>{template.school.code} · {template.school.name}</span>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.marker} ${styles.legendDot}`} /> Value position
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.markerLabel} ${styles.legendDot}`}>L</span> Label text
            </span>
          </div>

          <p className={styles.hint}>
            Drag <strong>teal dots</strong> for values and <strong>purple L</strong> for labels directly on the
            template preview.
          </p>

          <p className={styles.sectionLabel}>Elements</p>
          <div className={styles.fieldList}>
            <button
              type="button"
              className={`${styles.fieldBtn} ${selected === "photo" ? styles.fieldBtnActive : ""}`}
              onClick={() => setSelected("photo")}
            >
              Photo area
              <span className={`${styles.fieldStatus} ${styles.fieldStatusOn}`}>on</span>
            </button>
            <button
              type="button"
              className={`${styles.fieldBtn} ${selected === "signature" ? styles.fieldBtnActive : ""}`}
              onClick={() => setSelected("signature")}
            >
              Signature area
              <span className={`${styles.fieldStatus} ${styles.fieldStatusOn}`}>on</span>
            </button>
            {EDITOR_FIELDS.map((key) => {
              const exists = layout.fields.some((f) => f.key === key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.fieldBtn} ${selected === key ? styles.fieldBtnActive : ""}`}
                  onClick={() => {
                    ensureField(key);
                    setSelected(key);
                  }}
                >
                  <span>{FIELD_LABELS[key]}</span>
                  <span className={`${styles.fieldStatus} ${exists ? styles.fieldStatusOn : ""}`}>
                    {exists ? "on" : "add"}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedLabel ? (
            <div className={styles.propsPanel}>
              <p className={styles.propsTitle}>{selectedLabel}</p>

              {selectedField ? (
                <div className="space-y-3">
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedField.showLabel)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const defaults = defaultLabelPosition(selectedField, sourceWidth);
                        updateField(selectedField.key, {
                          showLabel: checked,
                          labelX: checked ? (selectedField.labelX ?? defaults.labelX) : undefined,
                          labelY: checked ? (selectedField.labelY ?? defaults.labelY) : undefined,
                        });
                      }}
                    />
                    Show label (Name :, Class :, …)
                  </label>
                  <div>
                    <label className={styles.formLabel} htmlFor="field-font-size">
                      Font size
                    </label>
                    <input
                      id="field-font-size"
                      className={styles.formInput}
                      type="number"
                      min={10}
                      max={72}
                      value={selectedField.fontSize}
                      onChange={(e) =>
                        updateField(selectedField.key, { fontSize: Number(e.target.value) || 16 })
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selected === "photo" || selected === "signature" ? (
                <div className={styles.numberGrid}>
                  <div>
                    <label className={styles.formLabel} htmlFor="region-width">
                      Width
                    </label>
                    <input
                      id="region-width"
                      className={styles.formInput}
                      type="number"
                      min={20}
                      value={selected === "photo" ? layout.photo.width : layout.signature.width}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 20;
                        setLayout((prev) =>
                          selected === "photo"
                            ? { ...prev, photo: { ...prev.photo, width: value } }
                            : { ...prev, signature: { ...prev.signature, width: value } },
                        );
                      }}
                    />
                  </div>
                  <div>
                    <label className={styles.formLabel} htmlFor="region-height">
                      Height
                    </label>
                    <input
                      id="region-height"
                      className={styles.formInput}
                      type="number"
                      min={20}
                      value={selected === "photo" ? layout.photo.height : layout.signature.height}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 20;
                        setLayout((prev) =>
                          selected === "photo"
                            ? { ...prev, photo: { ...prev.photo, height: value } }
                            : { ...prev, signature: { ...prev.signature, height: value } },
                        );
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.sidebarFooter}>
            <div className={styles.actions}>
              <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void saveLayout()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              <button type="button" className={styles.previewBtn} disabled={previewing} onClick={() => void runPreview()}>
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview
              </button>
            </div>

            {message ? (
              <p
                className={`${styles.banner} ${
                  messageType === "success" ? styles.bannerSuccess : styles.bannerError
                }`}
              >
                {message}
              </p>
            ) : null}

            {previewUrl ? (
              <div className={styles.previewThumbWrap}>
                <button
                  type="button"
                  className={styles.previewThumbBtn}
                  onClick={() => setPreviewModalOpen(true)}
                  aria-label="Open full card preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Layout preview" className={styles.previewThumbImg} />
                  <p className={styles.previewThumbHint}>Click to open full preview</p>
                </button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <CardPreviewModal
        open={previewModalOpen && previewUrl != null}
        onClose={() => setPreviewModalOpen(false)}
        title={previewMeta?.name ?? "Card preview"}
        subtitle={previewMeta ? `${previewMeta.enrollId} · sample student` : undefined}
        imageSrc={previewUrl ?? ""}
        imageAlt="Layout preview"
      />
    </>
  );
}
