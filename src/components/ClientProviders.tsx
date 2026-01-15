'use client';

/**
 * ⚠️ CRITICAL CLIENT BOUNDARY
 *
 * This file intentionally isolates ALL client-only providers
 * (ThemeProvider, future analytics, etc.).
 *
 * ❌ DO NOT import this into server components
 * ❌ DO NOT move ThemeProvider back into app/layout.tsx
 *
 * Breaking this rule WILL cause ChunkLoadError
 * in Firebase Studio / Cloud Workstations.
 */

import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Mounted guard prevents:
   * - hydration mismatches
   * - stale chunk execution
   * - ThemeProvider running before window exists
   *
   * This is especially important in Firebase Studio.
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // 🔒 Prevents SSR/client mismatch
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="skomidora-theme"
    >
      {children}
    </ThemeProvider>
  );
}
