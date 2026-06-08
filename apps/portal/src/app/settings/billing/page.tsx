"use client";

import { PLAN_LIMITS } from "@idportal/contracts";
import { useAuthStore } from "@/lib/auth-store";

export default function BillingPage() {
  const organization = useAuthStore((s) => s.organization);
  const plan = (organization?.plan ?? "FREE") as keyof typeof PLAN_LIMITS;
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>
      <div className="rounded-xl border bg-white p-6 space-y-3">
        <p className="text-sm text-[var(--muted-foreground)]">Current plan</p>
        <p className="text-3xl font-bold">{plan}</p>
        <ul className="text-sm space-y-1">
          <li>Up to {limits.maxEmployeesPerBatch} employees per batch</li>
          <li>Up to {limits.maxBatchesPerMonth} batches per month</li>
        </ul>
        {plan === "FREE" ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Contact sales to upgrade to PRO (500 employees/batch, 100 batches/month). Razorpay checkout
            coming soon.
          </p>
        ) : null}
      </div>
    </div>
  );
}
