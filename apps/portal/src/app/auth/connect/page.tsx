"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { setToken } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";

function ConnectInner() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [error, setError] = useState("");

  useEffect(() => {
    const source = params.get("source");
    const token = params.get("token");
    if (!source || !token) {
      setError("Missing SSO parameters");
      return;
    }

    async function connect() {
      try {
        const res = await fetch(
          `/api/auth/connect?source=${encodeURIComponent(source!)}&token=${encodeURIComponent(token!)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "SSO failed");
        setToken(json.token);
        await hydrate();
        router.replace("/dashboard");
      } catch (e) {
        setError(e instanceof Error ? e.message : "SSO failed");
      }
    }
    void connect();
  }, [params, router, hydrate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm">{error || "Connecting from your SaaS app…"}</p>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectInner />
    </Suspense>
  );
}
