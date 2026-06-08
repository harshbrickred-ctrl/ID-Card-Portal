"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch<{
        token: string;
        user: { id: string; email: string; name: string };
        organization: { id: string; name: string; plan: string };
      }>("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSession(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Create account</h1>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {(["name", "email", "password", "organizationName"] as const).map((field) => (
          <input
            key={field}
            className="w-full rounded-lg border px-3 py-2"
            type={field === "password" ? "password" : field === "email" ? "email" : "text"}
            placeholder={
              field === "organizationName"
                ? "Organization name"
                : field.charAt(0).toUpperCase() + field.slice(1)
            }
            value={form[field]}
            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
            required
          />
        ))}
        <button type="submit" className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-white">
          Sign up
        </button>
        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
