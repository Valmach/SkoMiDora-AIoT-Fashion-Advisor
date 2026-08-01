// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';
import AutoRefreshOnCrash from '@/components/AutoRefreshOnCrash';
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar"; 

// 1. SEO Metadata
export const metadata: Metadata = {
  title: 'SkoMiDora',
  description: 'AI Fashion & Wardrobe Intelligence',
};

// 2. UI Viewport Settings (Fixes the Next.js warning)
export const viewport: Viewport = {
  colorScheme: 'dark',
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
              <main className="flex-grow flex flex-col h-[100dvh] md:h-screen w-full overflow-y-auto">
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