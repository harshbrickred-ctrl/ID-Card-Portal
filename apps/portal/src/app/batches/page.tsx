"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiDownload, apiFetch } from "@/lib/api/client";

type Batch = {
  id: string;
  name: string;
  templatePreset: string;
  employeeCount: number;
  status: string;
  createdAt: string;
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    void apiFetch<Batch[]>("/v1/batches").then(setBatches);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Print batches</h1>
        <Link href="/batches/new" className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white">
          New batch
        </Link>
      </div>
      <div className="space-y-2">
        {batches.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
            <div>
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {b.employeeCount} cards · {b.templatePreset} · {b.status} ·{" "}
                {new Date(b.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => apiDownload(`/v1/batches/${b.id}/export`, `id-cards-${b.id}.zip`)}
            >
              Export ZIP
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
