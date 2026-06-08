"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type Integration = {
  id: string;
  source: string;
  externalOrgId: string | null;
  apiBaseUrl: string | null;
  lastSyncAt: string | null;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void apiFetch<Integration[]>("/v1/integrations").then(setIntegrations);
  }, []);

  async function syncVetan(integrationId: string) {
    setMessage("");
    try {
      const result = await apiFetch<{ synced: number; total: number }>(
        `/v1/integrations/${integrationId}/sync`,
        { method: "POST", body: JSON.stringify({ apiKey: apiKey || undefined }) },
      );
      setMessage(`Synced ${result.synced} employees (${result.total} total)`);
      void apiFetch<Integration[]>("/v1/integrations").then(setIntegrations);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
    }
  }

  async function importCsv() {
    setMessage("");
    const lines = csv.trim().split("\n").slice(1);
    const rows = lines.map((line) => {
      const [employeeCode, firstName, lastName, department, designation, email] = line.split(",");
      return {
        employeeCode: employeeCode?.trim() ?? "",
        firstName: firstName?.trim() ?? "",
        lastName: lastName?.trim() ?? "",
        department: department?.trim(),
        designation: designation?.trim(),
        email: email?.trim(),
      };
    });
    try {
      const result = await apiFetch<{ synced: number }>("/v1/integrations/import-csv", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setMessage(`Imported ${result.synced} employees from CSV`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed");
    }
  }

  const vetan = integrations.find((i) => i.source === "vetan");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrations</h1>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">Vetan HR</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Generate an API key in Vetan Settings → Integrations, then paste it here and sync.
        </p>
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Vetan integration API key (vic_...)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        {vetan ? (
          <button
            type="button"
            onClick={() => syncVetan(vetan.id)}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white"
          >
            Sync from Vetan
          </button>
        ) : (
          <p className="text-sm text-amber-600">
            Connect via Vetan SSO first, or sign up standalone and configure API base URL later.
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="font-semibold">CSV import</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Header: employeeCode,firstName,lastName,department,designation,email
        </p>
        <textarea
          className="h-40 w-full rounded-lg border p-3 font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="employeeCode,firstName,lastName,department,designation,email&#10;EMP001,Raj,Sharma,Engineering,Developer,raj@acme.com"
        />
        <button
          type="button"
          onClick={importCsv}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Import CSV
        </button>
      </section>
    </div>
  );
}
