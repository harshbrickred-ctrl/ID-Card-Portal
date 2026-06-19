"use client";

import { Inter } from "next/font/google";
import { useEffect } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  return <div className={inter.variable}>{children}</div>;
}
