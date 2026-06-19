"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BarChart3,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Printer,
  Settings,
  Users,
  FileImage,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import styles from "./portal-shell.module.css";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "exact" as const },
  { href: "/schools", label: "Schools", icon: GraduationCap, match: "path" as const },
  { href: "/students", label: "Students", icon: Users, match: "path" as const },
  { href: "/templates", label: "Templates", icon: FileImage, match: "path" as const },
  { href: "/print", label: "Print IDs", icon: Printer, match: "path" as const },
  { href: "#reports", label: "Reports", icon: BarChart3, match: "none" as const },
  { href: "#settings", label: "Settings", icon: Settings, match: "none" as const },
];

function isNavActive(
  item: (typeof nav)[number],
  pathname: string,
): boolean {
  if (item.match === "none") return false;
  if (item.match === "exact") return pathname === "/dashboard";
  if (item.match === "path") return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return false;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hydrated, logout, hydrate, isSuperAdmin } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, hydrated, pathname, router]);

  const isLightShell =
    pathname === "/dashboard" ||
    pathname === "/schools" ||
    pathname === "/students" ||
    pathname === "/templates" ||
    pathname.startsWith("/templates/") ||
    pathname === "/print" ||
    pathname.startsWith("/print/");

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      {!isLightShell ? <div className="mesh-bg" /> : null}
      <div className={styles.appFrame}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className={styles.brandTitle}>School ID Cards</p>
              <p className={styles.brandSub}>Print Portal</p>
            </div>
          </div>

          <nav className={styles.nav}>
            {nav.map((item, index) => {
              const active = isNavActive(item, pathname);
              const showDivider = item.match === "none" && index === nav.findIndex((n) => n.match === "none");
              return (
                <div key={item.label}>
                  {showDivider ? <div className={styles.navDivider} aria-hidden="true" /> : null}
                  <Link
                    href={item.href}
                    className={cn(styles.navLink, active && styles.navLinkActive)}
                    onClick={
                      item.match === "none"
                        ? (e) => e.preventDefault()
                        : undefined
                    }
                  >
                    <span className={styles.navIcon} aria-hidden="true">
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className={styles.userCard}>
            <div className={styles.userRow}>
              <div className={styles.userAvatar}>{userInitials(user?.name ?? "SA")}</div>
              <div className={styles.userMeta}>
                <p className={styles.userName}>{user?.name ?? "School Admin"}</p>
                <p className={styles.userEmail}>{user?.email ?? ""}</p>
              </div>
            </div>
            <span className={styles.roleBadge}>{isSuperAdmin() ? "Super Admin" : "Admin"}</span>
            <Link href="/dashboard" className={styles.helpLink}>
              <HelpCircle className="h-4 w-4" />
              Help Center
            </Link>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => router.push("/login"));
              }}
              className={styles.signOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className={cn(styles.contentColumn, isLightShell && styles.contentColumnDashboard)}>
          <main className={cn(styles.main, isLightShell && styles.mainDashboard)}>{children}</main>
          {isLightShell ? (
            <footer className={styles.footer}>
              <div className={styles.footerInner}>
                © {new Date().getFullYear()} School ID Cards Print Portal. All rights reserved.
              </div>
            </footer>
          ) : null}
        </div>
      </div>
    </>
  );
}
