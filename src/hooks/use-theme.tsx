"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "almost-dark";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
}

const initialContextState: ThemeProviderState = {
  theme: "light", // Default for context if provider is somehow not found
  setTheme: () => null,
};

const ThemeProviderContext =
  createContext<ThemeProviderState>(initialContextState);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "skomidora-theme", // Updated storage key
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize state:
    // On the server, or if window/localStorage is not available, use defaultTheme.
    // On the client, try to read from localStorage.
    if (typeof window === "undefined") {
      return defaultTheme;
    }
    try {
      const storedTheme = window.localStorage.getItem(
        storageKey,
      ) as Theme | null;
      if (
        storedTheme &&
        ["light", "dark", "almost-dark"].includes(storedTheme)
      ) {
        return storedTheme;
      }
    } catch (e) {
      // localStorage can be disabled or unavailable (e.g. incognito mode, security settings)
      console.warn(
        `Failed to read theme from localStorage ('${storageKey}'):`,
        e,
      );
    }
    return defaultTheme;
  });

  // Effect to apply theme to DOM and update localStorage when theme state changes.
  // This effect runs only on the client.
  useEffect(() => {
    // Ensure access to window and document only on client
    if (
      typeof window === "undefined" ||
      typeof window.document === "undefined"
    ) {
      return;
    }

    const root = window.document.documentElement;
    root.classList.remove("light", "dark", "almost-dark");
    root.classList.add(theme);

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (e) {
      console.warn(
        `Failed to save theme to localStorage ('${storageKey}'):`,
        e,
      );
    }
  }, [theme, storageKey]); // Re-run when theme or storageKey changes

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
