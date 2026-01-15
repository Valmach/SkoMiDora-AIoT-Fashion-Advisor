import './globals.css';
import ClientProviders from '@/components/ClientProviders';
import AutoRefreshOnCrash from '@/components/AutoRefreshOnCrash'; // Optional: Remove if you deleted this file

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
      {/* 1. FLEX LAYOUT: Forces footer to the bottom */}
      <body className="bg-black text-white antialiased min-h-screen flex flex-col">
        
        {/* Optional Safety Fix */}
        <AutoRefreshOnCrash />

        <ClientProviders>
          {/* 2. MAIN GROW: Pushes footer down if content is short */}
          <main className="flex-grow">
            {children}
          </main>
        </ClientProviders>

        {/* 3. GLOBAL FOOTER */}
        <footer className="py-8 bg-black border-t border-zinc-900 text-center z-50 relative mt-auto">
          <p className="text-[10px] text-zinc-600 tracking-wider uppercase font-medium">
            App Designed, Created & Developed by <span className="text-zinc-400">Valentino Massimo</span>, @SkoMiDora @SHOURAiGen — 2026 All Rights Reserved
          </p>
        </footer>

      </body>
    </html>
  );
}