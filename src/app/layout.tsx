// src/app/layout.tsx
import type { Metadata } from "next";
import { Dosis, IBM_Plex_Mono, Kaushan_Script } from "next/font/google";
import "./globals.css";

// --- UI Components ---

import AppSidebar from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import AppMain from "@/components/layout/AppMain";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/components/layout/Header";

// ✅ FIX 1: Import the Client-Side Provider Wrapper
// If you don't have this file yet, create it (code provided below).
// This isolates the hydration logic from the main server layout chunk.
// ✅ Correct Import
import { ThemeProvider } from "@/components/theme-provider";

// ❌ Delete this old line if it exists:
// import { ThemeProvider } from "@/hooks/use-theme";
// ✅ FIX 2: Firebase Client Provider
// This handles the auth state safely on the client side.
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
        {/* ✅ FIX 3: Using the specific Client Component wrapper 
           This prevents the 'ChunkLoadError' by ensuring the theme logic
           only executes in the browser, not during the initial HTML stream.
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="skomidora-theme"
        >
          <FirebaseClientProvider>
            <TooltipProvider>
              <SidebarProvider>
                <div className="flex flex-1">
                  <AppSidebar />
                  <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
                    <Header />
                    {/* AppMain handles the scrolling area */}
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