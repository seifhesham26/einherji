"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * One filter, stored in the query string instead of component state.
 *
 * Filters held in `useState` are invisible to everything outside the component:
 * a reload resets them, the back button steps out of the page rather than out of
 * the filter, and a filtered view can't be linked to. Putting them in the URL
 * fixes all three and costs nothing.
 *
 * `replace` rather than `push` — flicking through filters shouldn't bury the
 * previous page under a dozen history entries.
 */
export function useQueryFilter(paramName: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(paramName);

  const setValue = useCallback(
    (nextValue: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextValue) params.set(paramName, nextValue);
      else params.delete(paramName);

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    },
    [paramName, pathname, router, searchParams],
  );

  return [value, setValue] as const;
}
