
import type { Metadata } from "next";
import { Dosis, IBM_Plex_Mono, Kaushan_Script } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import AppMain from "@/components/layout/AppMain";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FirebaseClientProvider } from "@/firebase/client-provider";

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
        <ThemeProvider storageKey="skomidora-theme" defaultTheme="dark">
          <FirebaseClientProvider>
            <TooltipProvider>
              <SidebarProvider>
                <div className="flex flex-1">
                  <AppSidebar />
                  <AppMain>{children}</AppMain>
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
