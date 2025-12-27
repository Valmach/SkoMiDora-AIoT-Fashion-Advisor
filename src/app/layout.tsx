// src/app/layout.tsx
import type { Metadata } from "next";
import { Dosis, IBM_Plex_Mono, Kaushan_Script } from "next/font/google";
import "./globals.css";

// --- Providers & UI ---
import { ThemeProvider } from "@/hooks/use-theme";
import AppSidebar from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import AppMain from "@/components/layout/AppMain";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/components/layout/Header";

// ✅ FIX: Import directly. Do NOT use dynamic(..., { ssr: false }) here.
// The FirebaseClientProvider itself handles client-side safety.
import { FirebaseClientProvider } from "@/firebase/client-provider";

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
    ROOT LAYOUT
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
        <ThemeProvider
          storageKey="skomidora-theme"
          defaultTheme="dark"
        >
          {/* ✅ Wrapped directly. This is now safe for Next.js 15 build */}
          <FirebaseClientProvider>
            <TooltipProvider>
              <SidebarProvider>
                <div className="flex flex-1">
                  <AppSidebar />
                  <div className="flex flex-col flex-1 min-h-screen">
                    <Header />
                    <AppMain>{children}</AppMain>
                  </div>
                </div>
                <Toaster />
              </SidebarProvider>
            </TooltipProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}