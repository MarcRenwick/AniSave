import { useLayoutEffect, useRef } from "react";

// Keeps the window's scroll position exactly where it was across a same-page
// content swap - switching a filter/sort/tab - instead of letting the swap
// (and, if the new content is shorter, the browser's own scroll clamping)
// visibly snap the page back toward the top. Pass whatever value changes
// when that content swaps (e.g. the active filter key); an actual page
// navigation is handled separately by ScrollToTop and is unaffected.
export default function usePreserveScroll(key) {
  const lastScrollY = useRef(typeof window === "undefined" ? 0 : window.scrollY);

  useLayoutEffect(() => {
    window.scrollTo({ top: lastScrollY.current, left: 0, behavior: "instant" });
  }, [key]);

  useLayoutEffect(() => {
    const handleScroll = () => {
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
}
