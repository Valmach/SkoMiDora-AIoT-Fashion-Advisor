import './globals.css';
import ClientProviders from '@/components/ClientProviders';

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
      <body className="bg-black text-white antialiased">
        {/*
          ClientProviders is a CLIENT-ONLY boundary.
          ThemeProvider must NEVER live directly in layout.tsx
          or Firebase Studio / Cloud Workstations will ChunkLoadError.
        */}
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
