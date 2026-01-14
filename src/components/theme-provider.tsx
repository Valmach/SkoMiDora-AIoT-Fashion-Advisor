"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// ✅ FIX: Extract types directly from the component. 
// This removes the dependency on specific internal file paths.
export function ThemeProvider({ 
  children, 
  ...props 
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}