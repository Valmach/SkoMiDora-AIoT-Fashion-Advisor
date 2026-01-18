// src/app/layout.tsx
import type { Metadata } from "next";
import { Dosis, IBM_Plex_Mono, Kaushan_Script } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";

// Server-only layout components
import AppSidebar from "@/components/layout/AppSidebar";
import AppMain from "@/components/layout/AppMain";
import Header from "@/components/layout/Header";

// ✅ SINGLE client boundary
import ClientProviders from "@/components/ClientProviders";

/* ============================================================
   FONTS
============================================================ */
const dosis = Dosis({ subsets: ["latin"], variable: "--font-dosis" });

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-mono",
});

const kaushanScript = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kaushan-script",
});

/* ============================================================
   METADATA
============================================================ */
export const metadata: Metadata = {
  title: "SkoMiDora AIoT Fashion Advisor",
  description: "Your personal AI-powered stylist for footwear and fashion.",
};

/* ============================================================
   ROOT LAYOUT (SERVER ONLY)
============================================================ */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased flex",
          dosis.variable,
          ibmPlexMono.variable,
          kaushanScript.variable
        )}
      >
        {/* 🔒 CLIENT BOUNDARY — NOTHING CLIENT-ONLY ABOVE THIS */}
        <ClientProviders>
          <div className="flex flex-1">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
              <Header />
              <AppMain>{children}</AppMain>
            </div>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
