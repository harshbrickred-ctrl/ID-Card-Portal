"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type DashboardData = {
  organization: { name: string; plan: string } | null;
  employeeCount: number;
  missingPhotos: number;
  lastBatch: { id: string; name: string; createdAt: string } | null;
  integration: { source: string; lastSyncAt: string | null } | null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void apiFetch<DashboardData>("/v1/dashboard").then(setData);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Bulk CR-80 ID card printing for {data?.organization?.name ?? "your organization"}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Employees" value={data?.employeeCount ?? 0} />
        <Stat label="Missing photos" value={data?.missingPhotos ?? 0} />
        <Stat label="Plan" value={data?.organization?.plan ?? "FREE"} />
        <Stat
          label="Last sync"
          value={
            data?.integration?.lastSyncAt
              ? new Date(data.integration.lastSyncAt).toLocaleDateString()
              : "Never"
          }
        />
      </div>
      <div className="flex gap-3">
        <Link
          href="/batches/new"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white"
        >
          New print batch
        </Link>
        <Link href="/integrations" className="rounded-lg border px-4 py-2 text-sm">
          Sync employees
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
