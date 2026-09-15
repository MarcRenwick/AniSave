import { useLayoutEffect } from "react";

// Reveals a container's top-level sections as they scroll into the window
// and hides them again once they scroll back out, so the effect responds to
// scrolling in either direction. Modal overlays (Tailwind's `fixed` utility)
// are skipped since they sit outside the normal scroll flow.
export default function useScrollReveal(containerRef) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("scroll-reveal-visible", entry.isIntersecting);
        });
      },
      // threshold 0 (any sliver counts), not a fraction of the target: a
      // section taller than ~12 screens can never show 8% of itself, and
      // would sit at opacity 0 forever.
      { threshold: 0, rootMargin: "0px 0px -8% 0px" }
    );

    const observeChildren = () => {
      Array.from(container.children).forEach((child) => {
        if (child.classList.contains("fixed")) return;
        child.classList.add("scroll-reveal");
        observer.observe(child);
      });
    };

    observeChildren();

    const mutationObserver = new MutationObserver(observeChildren);
    mutationObserver.observe(container, { childList: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef]);
}
