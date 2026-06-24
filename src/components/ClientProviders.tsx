'use client';

/**
 * ⚠️ CRITICAL CLIENT BOUNDARY
 *
 * This file intentionally isolates ALL client-only providers:
 * - ThemeProvider
 * - Firebase client SDK
 * - Radix UI providers (Tooltip, etc.)
 *
 * ❌ DO NOT import this into server components
 * ❌ DO NOT move providers back into app/layout.tsx
 *
 * Breaking this rule WILL cause:
 * - ChunkLoadError
 * - hydration mismatches
 * - Firebase double initialization
 * - Radix / floating-ui crashes
 *
 * Firebase Studio / Cloud Workstations SAFE.
 */

import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';

// 🔐 Firebase (client-only)
import { FirebaseProvider } from '@/firebase/provider';

// 🎯 UI Providers
import { TooltipProvider } from '@/components/ui/tooltip';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Mounted guard prevents:
   * - hydration mismatches
   * - stale chunk execution
   * - providers running before `window` exists
   *
   * This is especially important in:
   * - Next.js 15
   * - Firebase Studio / Cloud Workstations
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // 🔒 INTENTIONAL: prevents SSR/client mismatch
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="skomidora-theme"
    >
      <FirebaseProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
