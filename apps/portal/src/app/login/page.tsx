"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("demo@idcards.local");
  const [password, setPassword] = useState("Demo@12345");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch<{
        token: string;
        user: { id: string; email: string; name: string };
        organization: { id: string; name: string; plan: string };
      }>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-[var(--muted-foreground)]">ID Card Portal — standalone or via Vetan SSO</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <input
          className="w-full rounded-lg border px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          className="w-full rounded-lg border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
        >
          Sign in
        </button>
        <p className="text-center text-sm">
          No account?{" "}
          <Link href="/signup" className="text-[var(--primary)] underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
