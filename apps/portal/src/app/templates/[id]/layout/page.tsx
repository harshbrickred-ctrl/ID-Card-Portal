"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { LayoutEditor, type LayoutEditorTemplate } from "@/components/layout-editor/LayoutEditor";
import dash from "@/components/dashboard/dashboard.module.css";
import styles from "@/components/layout-editor/LayoutEditor.module.css";

export default function TemplateLayoutPage() {
  const params = useParams<{ id: string }>();
  const [template, setTemplate] = useState<LayoutEditorTemplate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    apiFetch<LayoutEditorTemplate>(`/v1/templates/${params.id}`)
      .then(setTemplate)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load template"));
  }, [params.id]);

  return (
    <div className={dash.root}>
      <div className={dash.pageInner}>
        {error ? <p className={styles.errorState}>{error}</p> : null}
        {!error && !template ? (
          <div className={styles.loadingState}>
            <Loader2 className="h-5 w-5 animate-spin text-[#0d9488]" />
            Loading layout editor…
          </div>
        ) : null}
        {template ? <LayoutEditor template={template} /> : null}
      </div>
    </div>
  );
}
