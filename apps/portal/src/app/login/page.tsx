"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import type { AuthUser } from "@idportal/contracts";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import styles from "./login.module.css";

const REMEMBER_KEY = "idportal-remember-email";
const isDev = process.env.NODE_ENV === "development";

const WORKFLOW_STEPS = ["Students", "Templates", "Print queue", "ID cards"];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(isDev ? "Admin@12345" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    } else if (isDev) {
      setEmail("admin@schoolcards.local");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, email);
      else localStorage.removeItem(REMEMBER_KEY);
      setSession(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.right} aria-hidden="true">
        <Image
          src="/images/login-hero.png"
          alt="3D visualization of school ID cards, templates, and print workflow"
          fill
          className={styles.heroImage}
          priority
          sizes="58vw"
        />
        <div className={styles.heroOverlay} />

        <div className={styles.workflow}>
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step}>
              <div className={styles.workflowStep}>
                <span className={styles.workflowDot} />
                {step}
              </div>
              {index < WORKFLOW_STEPS.length - 1 ? (
                <div className={styles.workflowArrow} aria-hidden="true">
                  ↓
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className={styles.heroBadge}>
          <p className={styles.heroBadgeTitle}>Enterprise ready</p>
          <p className={styles.heroBadgeText}>
            From student records to print-ready ID cards — one secure workspace for your entire
            school network.
          </p>
        </div>
      </section>

      <section className={styles.authStage} aria-label="Sign in">
        <div className={styles.mobileHero} aria-hidden="true">
          <Image
            src="/images/login-hero.png"
            alt=""
            width={1280}
            height={720}
            className={styles.mobileHeroImg}
            priority
          />
        </div>

        <div className={styles.authCard}>
          <div className={styles.logoWrap} aria-hidden="true">
            <GraduationCap className="h-7 w-7" strokeWidth={2.25} />
          </div>

          <h1 className={styles.title}>School ID Card Portal</h1>
          <p className={styles.subtitle}>
            Manage students, templates, schools and ID card printing from a single workspace.
          </p>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className={styles.form}>
            <div>
              <label className={styles.fieldLabel} htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
                required
              />
            </div>

            <div>
              <label className={styles.fieldLabel} htmlFor="login-password">
                Password
              </label>
              <div className={styles.inputWrap}>
                <input
                  id="login-password"
                  className={`${styles.input} ${styles.inputWithToggle}`}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.remember}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <Link
                href="mailto:support@schoolcards.local?subject=Password%20reset%20request"
                className={styles.forgotLink}
              >
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className={styles.footer}>
            Need help?{" "}
            <Link href="mailto:support@schoolcards.local" className={styles.footerLink}>
              Contact support
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
