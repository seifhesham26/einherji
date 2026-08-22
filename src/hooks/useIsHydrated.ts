"use client";

import { useSyncExternalStore } from "react";

// Nothing ever changes, so the store never notifies. The whole mechanism is
// being used for one property: server and client snapshots are allowed to differ.
const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * For values only the browser can know — the user's clock, their stored theme.
 * Reading those during render makes the server produce different HTML from the
 * client's first paint, which is a hydration mismatch; React logs it and then
 * silently patches the DOM.
 *
 * `useSyncExternalStore` rather than the usual `useState(false)` +
 * `useEffect(() => setMounted(true))`: that pattern sets state synchronously
 * inside an effect, which schedules a second render pass of the whole subtree
 * and is what `react-hooks/set-state-in-effect` is pointing at. This is the
 * supported way to say "these two renders differ on purpose".
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
}
