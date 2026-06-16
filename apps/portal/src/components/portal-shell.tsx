"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Printer,
  Users,
  FileImage,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileImage },
  { href: "/students", label: "Students", icon: Users },
  { href: "/print", label: "Print", icon: Printer },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user, logout, hydrate, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [token, pathname, router]);

  if (pathname === "/login") {
    return (
      <>
        <div className="mesh-bg" />
        {children}
      </>
    );
  }

  return (
    <>
      <div className="mesh-bg" />
      <div className="flex min-h-screen">
        <aside className="glass fixed inset-y-0 left-0 z-20 flex w-[17.5rem] flex-col p-5">
          <div className="mb-10 flex items-center gap-3">
            <div className="logo-mark flex h-11 w-11 items-center justify-center rounded-2xl">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold leading-tight text-[var(--angora-goat)]">School ID Cards</p>
              <p className="text-xs text-[var(--cinema-screen)]">Print Portal</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "nav-active"
                      : "text-[var(--endless-slumber)] hover:bg-white/5 hover:text-[var(--orchid-hush)]",
                  )}
                >
                  <item.icon className={cn("h-4 w-4", active && "text-[var(--angora-goat)]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-xl border border-[var(--border)] bg-black/15 p-3">
            <p className="truncate text-sm font-medium text-[var(--angora-goat)]">
              {user?.name ?? "Admin"}
            </p>
            <p className="truncate text-xs text-[var(--cinema-screen)]">{user?.email}</p>
            <p className="mt-1 text-xs text-[var(--endless-slumber)]">
              {isSuperAdmin() ? "Super Admin" : "Admin"} ·{" "}
              {isSuperAdmin() ? "Full access" : "Can manage templates"}
            </p>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="btn-ghost mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="ml-[17.5rem] flex-1 p-8 lg:p-10">{children}</main>
      </div>
    </>
  );
}
