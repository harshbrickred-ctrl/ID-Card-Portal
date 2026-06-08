"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_TEMPLATE_PRESETS } from "@idportal/contracts";
import { apiFetch } from "@/lib/api/client";

type Employee = { id: string; employeeCode: string; firstName: string; lastName: string; status: string };

export default function NewBatchPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("Batch " + new Date().toISOString().slice(0, 10));
  const [preset, setPreset] = useState<(typeof CARD_TEMPLATE_PRESETS)[number]>("corporate");
  const [error, setError] = useState("");

  useEffect(() => {
    void apiFetch<Employee[]>("/v1/employees").then((rows) => {
      const active = rows.filter((r) => r.status === "ACTIVE");
      setEmployees(active);
      setSelected(new Set(active.map((r) => r.id)));
    });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const batch = await apiFetch<{ id: string }>("/v1/batches", {
        method: "POST",
        body: JSON.stringify({
          name,
          templatePreset: preset,
          employeeSnapshotIds: Array.from(selected),
        }),
      });
      router.push("/batches");
      void batch;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create batch");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">New print batch</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <input
        className="w-full rounded-lg border px-3 py-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Batch name"
      />
      <div>
        <label className="text-sm font-medium">Template</label>
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={preset}
          onChange={(e) => setPreset(e.target.value as typeof preset)}
        >
          {CARD_TEMPLATE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="mb-2 text-sm font-medium">Employees ({selected.size} selected)</p>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {employees.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
              <span className="font-mono">{e.employeeCode}</span>
              <span>
                {e.firstName} {e.lastName}
              </span>
            </label>
          ))}
        </div>
      </div>
      <button type="submit" className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white">
        Create batch
      </button>
    </form>
  );
}
