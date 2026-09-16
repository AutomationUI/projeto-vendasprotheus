import { useCallback, useState } from "react";

/**
 * Persists state to localStorage with JSON serialization.
 * Falls back gracefully if localStorage is unavailable.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
          window.localStorage.setItem(key, JSON.stringify(next));
          return next;
        });
      } catch {
        // Silently fail if storage is full/blocked
      }
    },
    [key]
  );

  return [storedValue, setValue];
}
