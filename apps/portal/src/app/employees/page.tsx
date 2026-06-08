"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";

type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string | null;
  designation: string | null;
  status: string;
  photoUrl: string | null;
  photoOverride: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    void apiFetch<Employee[]>("/v1/employees").then(setEmployees);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Employees</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Synced employee snapshots used for ID card batches.
      </p>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)] text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3">Photo</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-mono">{e.employeeCode}</td>
                <td className="p-3">
                  {e.firstName} {e.lastName}
                </td>
                <td className="p-3">{e.department ?? "—"}</td>
                <td className="p-3">{e.status}</td>
                <td className="p-3">
                  {e.photoUrl || e.photoOverride ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-amber-600">Missing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
