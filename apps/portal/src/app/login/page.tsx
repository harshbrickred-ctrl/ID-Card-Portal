"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@schoolcards.local");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{
        token: string;
        user: { id: string; email: string; name: string };
      }>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card-elevated card-3d w-full max-w-md p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="logo-mark mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--angora-goat)]">School ID Card Portal</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--endless-slumber)]">
            Sign in to manage students and print ID cards
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-[var(--orchid-hush)]">Email</label>
            <input
              className="input-glass"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--orchid-hush)]">Password</label>
            <input
              className="input-glass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full rounded-xl px-4 py-3 font-semibold"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/15 p-3 text-xs text-[var(--endless-slumber)]">
          <p className="font-medium text-[var(--orchid-hush)]">Demo accounts</p>
          <p className="mt-1">Admin: admin@schoolcards.local</p>
          <p>Super Admin: superadmin@schoolcards.local</p>
        </div>
      </div>
    </div>
  );
}
