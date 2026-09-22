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

    // A page that marks its own sections with data-reveal gets those revealed
    // one at a time as they come into view. A page that marks nothing falls
    // back to its top-level blocks, which is how every page behaved before
    // any of them said otherwise.
    const targets = () => {
      const marked = container.querySelectorAll("[data-reveal]");
      return marked.length > 0 ? Array.from(marked) : Array.from(container.children);
    };

    const observeSections = () => {
      targets().forEach((section) => {
        if (section.classList.contains("fixed")) return;
        section.classList.add("scroll-reveal");
        observer.observe(section);
      });
    };

    observeSections();

    // Sections arrive as a page loads its data, so watch for them appearing
    // anywhere inside rather than only as direct children. A page rendering a
    // long list fires a great many mutations at once, so they are collected
    // into one pass on the next frame rather than each costing a sweep of the
    // whole subtree.
    let queued = 0;
    const mutationObserver = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        observeSections();
      });
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      if (queued) cancelAnimationFrame(queued);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef]);
}
