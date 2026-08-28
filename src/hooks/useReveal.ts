"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Whether an element has been scrolled into view yet.
 *
 * An IntersectionObserver rather than a scroll listener: a scroll handler runs
 * on every frame of every scroll, which is the wrong amount of work for a
 * question the browser will answer once, for free, when it changes.
 *
 * It never flips back. A section that fades out again when you scroll past it
 * is a section fighting the reader.
 */
export function useReveal<Element extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<Element>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isRevealed };
}
