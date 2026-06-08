"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreditCard, LayoutDashboard, Link2, LogOut, Users } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/integrations", label: "Integrations", icon: Link2 },
  { href: "/batches", label: "Batches", icon: CreditCard },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, organization, logout, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const publicPaths = ["/login", "/signup", "/auth/connect"];
    if (!token && !publicPaths.some((p) => pathname.startsWith(p))) {
      router.replace("/login");
    }
  }, [token, pathname, router]);

  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/auth/connect")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] p-4">
        <div className="mb-8">
          <p className="text-lg font-bold text-[var(--primary)]">ID Card Portal</p>
          <p className="text-xs text-[var(--muted-foreground)]">{organization?.name}</p>
          <p className="mt-1 text-xs rounded-full bg-[var(--muted)] px-2 py-0.5 inline-block">
            Plan: {organization?.plan ?? "FREE"}
          </p>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                pathname === item.href
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "hover:bg-[var(--muted)]",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="mt-8 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--muted)]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
