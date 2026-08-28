"use client";

import { useEffect, useState } from "react";

/**
 * The value, once it stops changing.
 *
 * The jobs search used to filter an array already in memory, so every keystroke
 * was free. It's a database query now, and sending one per character turns a
 * five-letter search into five round trips whose answers race each other.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
