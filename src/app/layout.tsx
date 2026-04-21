// src/app/layout.tsx
import './globals.css';
import ClientProviders from '@/components/ClientProviders';
import AutoRefreshOnCrash from '@/components/AutoRefreshOnCrash';
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar"; 

export const metadata = {
  title: 'SkoMiDora',
  description: 'AI Fashion & Wardrobe Intelligence',
  colorScheme: 'dark', // <-- This locks the browser into dark mode rendering
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">
        <AutoRefreshOnCrash />
        <ClientProviders>
          {/* ✅ THE FIX: SidebarProvider wrapping everything */}
          <SidebarProvider>
            <div className="flex flex-1 w-full">
              <AppSidebar />
              <main className="flex-grow flex flex-col min-h-screen w-full overflow-hidden">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </ClientProviders>
        <footer className="py-8 bg-black border-t border-zinc-900 text-center z-50 relative mt-auto">
          <p className="text-[10px] text-zinc-600 tracking-wider uppercase font-medium">
            App Designed, Created & Developed by{' '}
            <span className="text-zinc-400">Valentino Massimo</span>,{' '}
            @SkoMiDora @SHOURAiGen — 2026 All Rights Reserved
          </p>
        </footer>
      </body>
    </html>
  );
}