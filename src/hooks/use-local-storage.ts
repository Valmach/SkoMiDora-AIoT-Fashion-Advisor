"use client";

import { useState, useEffect, useCallback } from "react";

// A hook to use localStorage that is also server-side rendering friendly
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with the initialValue. This runs on server and client's first render, preventing mismatch.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // This effect runs *only* on the client, after the component has mounted.
  // It safely reads from localStorage and updates the state.
  useEffect(() => {
    // Prevent this from running on the server.
    if (typeof window === "undefined") {
      return;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        // If there's a stored value, parse and set it.
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      // If parsing fails (e.g., old non-JSON data) or any other error occurs, log it.
      // The hook will gracefully fall back to the initialValue that is already set.
      console.warn(
        `Could not parse or read localStorage key "${key}". ` +
          `Falling back to the default value.`,
        error,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // We only want this to run once on mount to get the initial stored value.

  // A memoized function to update the state and localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        // Save state
        setStoredValue(valueToStore);
        // Save to local storage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue],
  );

  // This effect syncs the state if the localStorage is changed from another tab.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(
            `Could not parse updated localStorage value for key "${key}" from another tab.`,
            error,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue];
}
