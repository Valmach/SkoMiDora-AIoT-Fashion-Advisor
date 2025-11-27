
import type { Metadata } from "next";
import { Dosis, IBM_Plex_Mono, Kaushan_Script } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";

import { ThemeProvider } from "@/hooks/use-theme";
import AppSidebar from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import AppMain from "@/components/layout/AppMain";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import Header from "@/components/layout/Header";

const FirebaseClientProvider = dynamic(
  () => import("@/firebase/client-provider").then((mod) => mod.FirebaseClientProvider),
  { ssr: false }
);

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

export const metadata: Metadata = {
  title: "SkoMiDora AIoT Fashion Advisor",
  description: "Your personal AI-powered stylist for footwear and fashion.",
};

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
