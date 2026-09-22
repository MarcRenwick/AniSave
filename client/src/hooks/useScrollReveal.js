import { useLayoutEffect } from "react";

// How much later each item on a row arrives than the one to its left, and how
// many of those steps a row is allowed before they all share the last one - so
// a row of twelve doesn't take most of a second to finish arriving.
const STAGGER_MS = 60;
const MAX_STAGGER_STEPS = 5;

// Reveals a container's sections as they scroll into the window and hides them
// again once they scroll back out, so the effect responds to scrolling in
// either direction. Modal overlays (Tailwind's `fixed` utility) are skipped
// since they sit outside the normal scroll flow.
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

    // A page says what should reveal in one of two ways. `data-reveal` marks a
    // single element - a heading, a panel. `data-reveal-children` marks a list
    // or grid whose items should each arrive on their own, which is what keeps
    // a long grid animating the whole way down instead of arriving in one go
    // at its first row. A page that marks nothing falls back to its top-level
    // blocks, which is how every page behaved before any of them said otherwise.
    const targets = () => {
      const marked = Array.from(container.querySelectorAll("[data-reveal]"));

      container.querySelectorAll("[data-reveal-children]").forEach((group) => {
        // Items sharing a row come in together, each a moment after the one to
        // its left. Grouping on offsetTop rather than on a column count keeps
        // that right whatever the grid is doing at the current width.
        const placeInRow = new Map();
        Array.from(group.children).forEach((item) => {
          const place = placeInRow.get(item.offsetTop) ?? 0;
          placeInRow.set(item.offsetTop, place + 1);
          item.style.transitionDelay =
            place === 0 ? "" : `${Math.min(place, MAX_STAGGER_STEPS) * STAGGER_MS}ms`;
          marked.push(item);
        });
      });

      return marked.length > 0 ? marked : Array.from(container.children);
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
