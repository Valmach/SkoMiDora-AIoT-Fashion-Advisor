// src/app/layout.tsx
import './globals.css';

import ClientProviders from '@/components/ClientProviders';
import AutoRefreshOnCrash from '@/components/AutoRefreshOnCrash';

export const metadata = {
  title: 'SkoMiDora',
  description: 'AI Fashion & Wardrobe Intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* 
        FLEX COLUMN LAYOUT
        - Ensures footer stays at bottom
        - Prevents layout shift
      */}
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">
        
        {/* 
          SAFETY NET
          - Auto-reloads on ChunkLoadError
          - Firebase Studio / Cloud Workstation safe
        */}
        <AutoRefreshOnCrash />

        {/* 
          🚧 CLIENT BOUNDARY
          - ALL client-only providers live here
          - ThemeProvider
          - Future analytics
          - Firebase client hydration
        */}
        <ClientProviders>
          {/* 
            MAIN CONTENT
            - flex-grow pushes footer down
            - pages render safely here
          */}
          <main className="flex-grow">
            {children}
          </main>
        </ClientProviders>

        {/* 
          GLOBAL FOOTER
          - Always rendered
          - Never hydrated by client providers
        */}
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
