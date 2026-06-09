import type { Metadata } from "next";
import { PortalShell } from "@/components/portal-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "School ID Card Portal",
  description: "Student ID card printing for schools",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}
