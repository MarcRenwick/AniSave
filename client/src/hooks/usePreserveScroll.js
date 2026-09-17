import { useLayoutEffect, useRef } from "react";

// Keeps the window's scroll position exactly where it was across a same-page
// content swap - switching a filter/sort/tab - instead of letting the swap
// (and, if the new content is shorter, the browser's own scroll clamping)
// visibly snap the page back toward the top. Pass whatever value changes when
// that content swaps (e.g. the active filter key).
export default function usePreserveScroll(key) {
  const lastScrollY = useRef(0);
  const previousKey = useRef(key);

  useLayoutEffect(() => {
    // Only restore when the key actually changed. On first mount the page is
    // brand new and must keep wherever ScrollToTop just put it - restoring
    // here would drag a freshly opened page down to the previous page's
    // scroll position.
    if (previousKey.current === key) return;
    previousKey.current = key;
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
