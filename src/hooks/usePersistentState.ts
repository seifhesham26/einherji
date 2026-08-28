"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * State that survives a reload, stored per browser.
 *
 * Written as an external store rather than state seeded from an effect. The
 * effect version rendered the fallback, then corrected itself on the next
 * commit — a visible flash of the wrong view mode on every page load, and a
 * cascading render for a preference that isn't worth one. useSyncExternalStore
 * exists for exactly this shape: a value that lives outside React, has a
 * different answer on the server, and must not desynchronise during hydration.
 *
 * `isValid` is required rather than optional: what comes out of localStorage was
 * written by an older version of this app as often as by this one, and a
 * "compact" that used to be called "dense" would otherwise put the component
 * into a state it has no branch for.
 */

// Same-tab writes don't raise a `storage` event — that only fires in *other*
// tabs — so the store keeps its own subscriber list and notifies them directly.
const localListeners = new Map<string, Set<() => void>>();

function subscribeToKey(storageKey: string, onStoreChange: () => void) {
  const listeners = localListeners.get(storageKey) ?? new Set<() => void>();
  listeners.add(onStoreChange);
  localListeners.set(storageKey, listeners);

  // The cross-tab half: another tab changing the same preference should move
  // this one too, which is what the user means by "remembered".
  window.addEventListener("storage", onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStored(storageKey: string): string | null {
  // Throws in a browser configured to block site data, and in some private
  // modes. A remembered preference is never worth breaking the page for.
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function usePersistentState<Value>(
  storageKey: string,
  fallback: Value,
  isValid: (candidate: unknown) => candidate is Value,
) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToKey(storageKey, onStoreChange),
    [storageKey],
  );

  // The snapshot is the raw string, not the parsed value: React compares
  // snapshots by identity, and JSON.parse hands back a new object every call,
  // which would re-render forever.
  const stored = useSyncExternalStore(
    subscribe,
    useCallback(() => readStored(storageKey), [storageKey]),
    // No localStorage on the server, so hydration starts from the fallback and
    // the real value arrives in the first client render.
    () => null,
  );

  const value = useMemo(() => {
    if (stored === null) return fallback;

    try {
      const parsed: unknown = JSON.parse(stored);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
    // isValid is a predicate the caller defines inline, so it is a new function
    // on every render. Leaving it out of the dependencies is safe — a type
    // guard has no state — and including it would recompute on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, fallback]);

  const persist = useCallback(
    (next: Value) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // The preference just doesn't survive this session. Not worth a toast.
      }
      localListeners.get(storageKey)?.forEach((listener) => listener());
    },
    [storageKey],
  );

  return [value, persist] as const;
}
