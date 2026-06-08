import type { Metadata } from "next";
import { PortalShell } from "@/components/portal-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ID Card Portal",
  description: "Bulk CR-80 employee ID card printing",
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
